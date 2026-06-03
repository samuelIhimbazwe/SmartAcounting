package com.smartaccounting.signup;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Invokes PostgreSQL auth scalar helpers with {@code varchar} JDBC casts.
 * Falls back to pre-V99 function names when {@code auth_*} helpers are missing on the DB.
 */
final class AuthScalarSql {

    private AuthScalarSql() {
    }

    static boolean callBoolean(
        JdbcTemplate jdbc,
        String function,
        String legacyFunction,
        Object... args
    ) {
        try {
            return Boolean.TRUE.equals(jdbc.queryForObject(booleanSql(function, args.length), Boolean.class, args));
        } catch (DataAccessException primaryError) {
            if (legacyFunction == null || !isMissingRoutine(primaryError)) {
                throw primaryError;
            }
            return Boolean.TRUE.equals(
                jdbc.queryForObject(booleanSql(legacyFunction, args.length), Boolean.class, args)
            );
        }
    }

    static String callJson(
        JdbcTemplate jdbc,
        String function,
        String legacyFunction,
        String arg
    ) {
        try {
            return jdbc.queryForObject(jsonSql(function), String.class, arg);
        } catch (DataAccessException primaryError) {
            if (legacyFunction == null || !isMissingRoutine(primaryError)) {
                throw primaryError;
            }
            return jdbc.queryForObject(jsonSql(legacyFunction), String.class, arg);
        }
    }

    static String callText(
        JdbcTemplate jdbc,
        String function,
        String legacyFunction,
        String arg
    ) {
        try {
            return jdbc.queryForObject(textSql(function), String.class, arg);
        } catch (DataAccessException primaryError) {
            if (legacyFunction == null || !isMissingRoutine(primaryError)) {
                throw primaryError;
            }
            return jdbc.queryForObject(textSql(legacyFunction), String.class, arg);
        }
    }

    static java.util.UUID callUuid(
        JdbcTemplate jdbc,
        String function,
        String legacyFunction,
        String arg
    ) {
        try {
            return jdbc.queryForObject(uuidSql(function), java.util.UUID.class, arg);
        } catch (DataAccessException primaryError) {
            if (legacyFunction == null || !isMissingRoutine(primaryError)) {
                throw primaryError;
            }
            return jdbc.queryForObject(uuidSql(legacyFunction), java.util.UUID.class, arg);
        }
    }

    private static String booleanSql(String function, int argCount) {
        return "select " + function + "(" + placeholders(argCount) + ")";
    }

    private static String jsonSql(String function) {
        return jsonSql(function, 1);
    }

    private static String jsonSql(String function, int argCount) {
        return "select " + function + "(" + placeholders(argCount) + ")";
    }

    private static String textSql(String function) {
        return "select " + function + "(" + placeholders(1) + ")";
    }

    private static String uuidSql(String function) {
        return "select " + function + "(" + placeholders(1) + ")";
    }

    private static String placeholders(int count) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < count; i++) {
            if (i > 0) {
                sb.append(", ");
            }
            sb.append("?::varchar");
        }
        return sb.toString();
    }

    static boolean isMissingRoutine(DataAccessException error) {
        Throwable cause = error.getMostSpecificCause();
        String message = cause != null ? cause.getMessage() : error.getMessage();
        if (message == null) {
            return false;
        }
        String lowered = message.toLowerCase();
        return lowered.contains("does not exist")
            || lowered.contains("bad sql grammar")
            || lowered.contains("could not find function");
    }
}
