from fastapi import HTTPException, status


class AppError(HTTPException):
    def __init__(self, code: str, message: str, http_status: int = 400, details: dict | None = None) -> None:
        super().__init__(
            status_code=http_status,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": details or {},
                }
            },
        )


def not_found(code: str = "common.not_found", message: str = "Not found") -> AppError:
    return AppError(code, message, http_status=status.HTTP_404_NOT_FOUND)


def forbidden(code: str = "common.forbidden", message: str = "Forbidden") -> AppError:
    return AppError(code, message, http_status=status.HTTP_403_FORBIDDEN)


def unauthorized(code: str = "auth.unauthorized", message: str = "Unauthorized") -> AppError:
    return AppError(code, message, http_status=status.HTTP_401_UNAUTHORIZED)


def bad_request(code: str = "common.bad_request", message: str = "Bad request", details: dict | None = None) -> AppError:
    return AppError(code, message, http_status=status.HTTP_400_BAD_REQUEST, details=details)


def conflict(code: str = "common.conflict", message: str = "Conflict") -> AppError:
    return AppError(code, message, http_status=status.HTTP_409_CONFLICT)


def too_many_requests(code: str = "common.rate_limited", message: str = "Too many requests") -> AppError:
    return AppError(code, message, http_status=status.HTTP_429_TOO_MANY_REQUESTS)
