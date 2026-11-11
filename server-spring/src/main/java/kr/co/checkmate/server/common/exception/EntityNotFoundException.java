package kr.co.checkmate.server.common.exception;

public class EntityNotFoundException extends BusinessException {

    public EntityNotFoundException(String message) {
        super("ENTITY_NOT_FOUND", message);
    }
}

