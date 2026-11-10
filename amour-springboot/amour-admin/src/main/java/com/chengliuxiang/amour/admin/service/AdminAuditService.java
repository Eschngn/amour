package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.audit.AdminAuditPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.audit.AdminAuditPageRspVO;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminAuditService {

    /**
     * 在调用方事务内记录成功审计；外层事务回滚时审计一并回滚。
     */
    void record(AdminAuditLogDO auditLog);

    /**
     * 独立事务记录失败审计，避免业务回滚后丢失失败痕迹。
     */
    void recordFailure(AdminAuditLogDO auditLog);

    Response<PageResult<AdminAuditPageRspVO>> findPage(AdminAuditPageReqVO reqVO);
}
