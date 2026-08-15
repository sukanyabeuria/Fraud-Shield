"""
Feature engineering module for Fraud-Shield.

Provides consistent feature transformation for both
training and inference.
"""

from typing import List

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


class FeatureEngineer:

    def __init__(self):
        self.scaler = StandardScaler()

        self.feature_names = [
            "amount",
            "previous_amount",
            "account_age",
            "transaction_frequency",
            "is_international",
            "is_new_recipient",
            "is_new_device",
        ]

        self.is_fitted = False

    def _prepare_raw_features(self, raw_data: pd.DataFrame) -> pd.DataFrame:
        """Convert raw transaction data into model-ready raw features."""

        df = raw_data.copy()

        # Numeric features
        numeric_defaults = {
            "amount": 0,
            "previous_amount": 0,
            "account_age": 0,
            "transaction_frequency": 0,
        }

        for column, default in numeric_defaults.items():
            if column not in df.columns:
                df[column] = default

        # Boolean features
        if "is_international" not in df.columns:
            df["is_international"] = (
                df["international_transfer"]
                if "international_transfer" in df.columns
                else False
            )

        if "is_new_recipient" not in df.columns:
            df["is_new_recipient"] = (
                df["new_recipient"]
                if "new_recipient" in df.columns
                else False
            )

        if "is_new_device" not in df.columns:
            # If frontend later provides an explicit boolean, use it.
            # Otherwise infer unknown/new devices from device_type.
            if "device_type" in df.columns:
                df["is_new_device"] = (
                    df["device_type"]
                    .astype(str)
                    .str.lower()
                    .isin(["unknown", "new", "unrecognized"])
                )
            else:
                df["is_new_device"] = False

        # Convert booleans to integers
        for column in [
            "is_international",
            "is_new_recipient",
            "is_new_device",
        ]:
            df[column] = df[column].astype(int)

        # Convert numeric columns safely
        for column in [
            "amount",
            "previous_amount",
            "account_age",
            "transaction_frequency",
        ]:
            df[column] = pd.to_numeric(
                df[column], errors="coerce"
            ).fillna(0)

        return df[self.feature_names].copy()

    def fit(self, raw_data: pd.DataFrame) -> "FeatureEngineer":
        """Fit preprocessing using training data."""

        features = self._prepare_raw_features(raw_data)

        self.scaler.fit(features)

        self.is_fitted = True

        return self

    def transform(self, raw_data: pd.DataFrame) -> pd.DataFrame:
        """Transform data using the fitted preprocessing pipeline."""

        if not self.is_fitted:
            raise ValueError(
                "Feature engineer must be fitted before transform."
            )

        features = self._prepare_raw_features(raw_data)

        transformed = self.scaler.transform(features)

        return pd.DataFrame(
            transformed,
            columns=self.feature_names,
            index=features.index,
        )

    def fit_transform(self, raw_data: pd.DataFrame) -> pd.DataFrame:
        """Fit preprocessing and transform training data."""

        self.fit(raw_data)

        return self.transform(raw_data)

    def get_feature_names(self) -> List[str]:
        """Return ordered model feature names."""

        return self.feature_names.copy()
