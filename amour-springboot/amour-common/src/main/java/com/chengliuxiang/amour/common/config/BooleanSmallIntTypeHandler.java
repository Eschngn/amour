package com.chengliuxiang.amour.common.config;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/** Maps Java Boolean values to the PostgreSQL smallint 0/1 convention. */
@MappedTypes(Boolean.class)
@MappedJdbcTypes(JdbcType.SMALLINT)
public class BooleanSmallIntTypeHandler extends BaseTypeHandler<Boolean> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, Boolean parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setShort(i, (short) (Boolean.TRUE.equals(parameter) ? 1 : 0));
    }

    @Override
    public Boolean getNullableResult(ResultSet rs, String columnName) throws SQLException {
        short value = rs.getShort(columnName);
        return rs.wasNull() ? null : value != 0;
    }

    @Override
    public Boolean getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        short value = rs.getShort(columnIndex);
        return rs.wasNull() ? null : value != 0;
    }

    @Override
    public Boolean getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        short value = cs.getShort(columnIndex);
        return cs.wasNull() ? null : value != 0;
    }
}
