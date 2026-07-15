"""Shared PII masking helpers."""


def mask_identifier(identifier: str) -> str:
    """Reveal only the last 4 chars of a PAN/IBAN/phone; mask the rest.

    Strings of length <= 4 are fully masked so short identifiers never leak.
    """
    if not identifier:
        return identifier
    if len(identifier) <= 4:
        return "*" * len(identifier)
    return identifier[-4:].rjust(len(identifier), "*")
