package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceMemberVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreReqVO;
import com.chengliuxiang.amour.admin.service.AdminSpaceService;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleInvitationMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceRestoreConfirmMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceUnbindRequestMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 后台情侣空间管理实现。
 *
 * <p>查询只返回后台需要的公开业务字段，不暴露密码、openid、内部 userId 等认证数据。
 * 人工恢复只处理 status=5（双方已完成解绑）空间，并在空间锁内通过事务一次性恢复
 * 两名已退出成员、空间状态与清理记录，任何一步失败都会整体回滚。</p>
 */
@Service
@Slf4j
public class AdminSpaceServiceImpl implements AdminSpaceService {

    private static final int SPACE_STATUS_NORMAL = 1;
    private static final int SPACE_STATUS_DELETED = 5;

    private static final int MEMBER_ROLE_CREATOR = 1;
    private static final int MEMBER_ROLE_PARTNER = 2;

    private static final int MEMBER_STATUS_INVITING = 0;
    private static final int MEMBER_STATUS_ACTIVE = 1;
    private static final int MEMBER_STATUS_PAUSED = 2;
    private static final int MEMBER_STATUS_LEFT = 3;
    private static final int MEMBER_STATUS_REMOVED = 4;

    private static final int SPACE_VISIBILITY_PRIVATE = 0;
    private static final int SPACE_VISIBILITY_PUBLIC = 1;

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private CoupleMemberMapper coupleMemberMapper;
    @Resource
    private CoupleInvitationMapper coupleInvitationMapper;
    @Resource
    private CoupleSpaceRestoreConfirmMapper restoreConfirmMapper;
    @Resource
    private CoupleSpaceUnbindRequestMapper unbindRequestMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private MessageMapper messageMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;
    @Resource
    private PlatformTransactionManager transactionManager;

    /**
     * 空间级内存锁：同一空间的多次人工恢复串行执行。
     * 数据库状态条件更新是跨实例的最终防线。
     */
    private final ConcurrentHashMap<Long, ReentrantLock> spaceLocks = new ConcurrentHashMap<>();

    private TransactionTemplate transactionTemplate;

    @PostConstruct
    public void init() {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public Response<PageResult<AdminSpacePageRspVO>> findSpacePage(AdminSpacePageReqVO reqVO) {
        requirePlatformAdmin();
        AdminSpacePageReqVO query = reqVO == null ? new AdminSpacePageReqVO() : reqVO;
        validateFilters(query);

        long current = query.getCurrent() == null || query.getCurrent() < 1 ? 1 : query.getCurrent();
        long size = query.getSize() == null || query.getSize() < 1
                ? DEFAULT_PAGE_SIZE : Math.min(query.getSize(), MAX_PAGE_SIZE);

        IPage<CoupleSpaceDO> page = coupleSpaceMapper.selectAdminPage(
                current, size, StrUtil.trim(query.getKeyword()), query.getStatus(), query.getVisibility());

        List<CoupleSpaceDO> spaces = page.getRecords();
        Map<Long, List<CoupleMemberDO>> memberMap = loadMemberMap(spaces);
        Map<Long, UserDO> userMap = loadUserMap(memberMap);

        List<AdminSpacePageRspVO> records = spaces.stream()
                .map(space -> toResponse(space, memberMap.get(space.getId()), userMap))
                .collect(Collectors.toList());

        return Response.success(PageResult.<AdminSpacePageRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<Void> restoreSpace(AdminSpaceRestoreReqVO reqVO) {
        requirePlatformAdmin();
        if (reqVO == null || reqVO.getSpaceId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Long spaceId = reqVO.getSpaceId();
        ReentrantLock lock = spaceLocks.computeIfAbsent(spaceId, key -> new ReentrantLock());
        lock.lock();
        try {
            // 事务必须在锁内提交，避免其他请求在提交前读到一半恢复的数据。
            return transactionTemplate.execute(status -> doRestoreSpace(spaceId));
        } finally {
            lock.unlock();
        }
    }

    private Response<Void> doRestoreSpace(Long spaceId) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        if (space.getStatus() == null || space.getStatus() != SPACE_STATUS_DELETED) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_NOT_ALLOWED);
        }

        List<CoupleMemberDO> members = coupleMemberMapper.selectBySpaceId(spaceId);
        if (members.size() != 2) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
        }
        for (CoupleMemberDO member : members) {
            if (member.getStatus() == null
                    || member.getStatus() != MEMBER_STATUS_LEFT
                    || member.getLeftAt() == null) {
                throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
            }
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. 两名历史成员恢复有效，清空 leftAt 并刷新 updateTime。
        int restoredMembers = coupleMemberMapper.restoreAllLeft(spaceId, now);
        if (restoredMembers != 2) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_MEMBER_INVALID);
        }

        // 2. 空间恢复正常且固定私密，清空归档/解绑时间；publicAt、spaceCode、创建者与内容保持不变。
        int restoredSpace = coupleSpaceMapper.restoreUnbound(spaceId, now);
        if (restoredSpace == 0) {
            throw new BizException(ResponseCodeEnum.SPACE_RESTORE_NOT_ALLOWED);
        }

        // 3. 清理旧解绑申请、恢复确认与待处理邀请，不触碰任何内容表。
        unbindRequestMapper.cancelPendingBySpaceId(spaceId, StpUtil.getLoginIdAsLong(), now);
        restoreConfirmMapper.deleteBySpaceId(spaceId);
        coupleInvitationMapper.revokePendingBySpaceId(spaceId, now);

        log.info("管理员 {} 人工恢复情侣空间 {}", StpUtil.getLoginIdAsLong(), spaceId);
        return Response.success();
    }

    private void validateFilters(AdminSpacePageReqVO reqVO) {
        if (reqVO.getStatus() != null
                && (reqVO.getStatus() < 0 || reqVO.getStatus() > SPACE_STATUS_DELETED)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        if (reqVO.getVisibility() != null
                && reqVO.getVisibility() != SPACE_VISIBILITY_PRIVATE
                && reqVO.getVisibility() != SPACE_VISIBILITY_PUBLIC) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
    }

    private Long requirePlatformAdmin() {
        Long userId = StpUtil.getLoginIdAsLong();
        UserDO user = userMapper.selectActiveById(userId);
        if (user == null || !Boolean.TRUE.equals(user.getIsPlatformAdmin())) {
            throw new BizException(ResponseCodeEnum.FORBIDDEN);
        }
        return userId;
    }

    private Map<Long, List<CoupleMemberDO>> loadMemberMap(List<CoupleSpaceDO> spaces) {
        if (spaces.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<Long> spaceIds = spaces.stream()
                .map(CoupleSpaceDO::getId)
                .collect(Collectors.toSet());
        return coupleMemberMapper.selectBySpaceIds(spaceIds).stream()
                .collect(Collectors.groupingBy(CoupleMemberDO::getSpaceId, Collectors.toList()));
    }

    private Map<Long, UserDO> loadUserMap(Map<Long, List<CoupleMemberDO>> memberMap) {
        Set<Long> userIds = new HashSet<>();
        for (List<CoupleMemberDO> members : memberMap.values()) {
            for (CoupleMemberDO member : members) {
                userIds.add(member.getUserId());
            }
        }
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userMapper.findUsersByIds(userIds).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private AdminSpacePageRspVO toResponse(CoupleSpaceDO space,
                                           List<CoupleMemberDO> members,
                                           Map<Long, UserDO> userMap) {
        List<CoupleMemberDO> safeMembers = members == null ? Collections.emptyList() : members;
        List<AdminSpaceMemberVO> memberVOs = safeMembers.stream()
                .map(member -> buildMemberVO(member, userMap.get(member.getUserId())))
                .collect(Collectors.toList());

        int activeMemberCount = (int) safeMembers.stream()
                .filter(member -> Objects.equals(member.getStatus(), MEMBER_STATUS_ACTIVE))
                .count();

        long storyCount = count(storyNodeMapper.countActiveBySpaceId(space.getId()));
        long photoCount = count(photoMapper.countActiveBySpaceId(space.getId()));
        long messageCount = count(messageMapper.countActiveBySpaceId(space.getId()));
        long anniversaryCount = count(anniversaryMapper.countActiveBySpaceId(space.getId()));

        String restoreBlockReason = restoreBlockReason(space, safeMembers);

        return AdminSpacePageRspVO.builder()
                .spaceId(space.getId())
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .status(space.getStatus())
                .statusText(spaceStatusText(space.getStatus()))
                .visibility(space.getVisibility())
                .visibilityText(visibilityText(space.getVisibility()))
                .deletedAt(format(space.getDeletedAt()))
                .createTime(format(space.getCreateTime()))
                .members(memberVOs)
                .memberCount(safeMembers.size())
                .activeMemberCount(activeMemberCount)
                .storyCount(storyCount)
                .photoCount(photoCount)
                .messageCount(messageCount)
                .anniversaryCount(anniversaryCount)
                .contentCount(storyCount + photoCount + messageCount + anniversaryCount)
                .restorable(restoreBlockReason.isEmpty())
                .restoreBlockReason(restoreBlockReason)
                .build();
    }

    private AdminSpaceMemberVO buildMemberVO(CoupleMemberDO member, UserDO user) {
        return AdminSpaceMemberVO.builder()
                .memberRole(member.getMemberRole())
                .roleText(memberRoleText(member.getMemberRole()))
                .amourId(user == null ? "" : StrUtil.blankToDefault(user.getAmourId(), ""))
                .displayName(user == null ? "恋人" : StrUtil.blankToDefault(user.getDisplayName(), "恋人"))
                .avatar(user == null ? "" : StrUtil.blankToDefault(user.getAvatar(), ""))
                .status(member.getStatus())
                .statusText(memberStatusText(member.getStatus()))
                .joinedAt(format(member.getJoinedAt()))
                .leftAt(format(member.getLeftAt()))
                .build();
    }

    /**
     * 人工恢复条件：status=5，且恰好保留两条原始成员关系，两名成员都是已退出并写有 leftAt。
     */
    private String restoreBlockReason(CoupleSpaceDO space, List<CoupleMemberDO> members) {
        if (space.getStatus() == null || space.getStatus() != SPACE_STATUS_DELETED) {
            return "只有双方已解绑的空间才能人工恢复";
        }
        if (members.size() != 2) {
            return "历史成员关系数量不是 2，无法人工恢复";
        }
        for (CoupleMemberDO member : members) {
            if (member.getStatus() == null || member.getStatus() != MEMBER_STATUS_LEFT) {
                return "存在未退出的历史成员，无法人工恢复";
            }
            if (member.getLeftAt() == null) {
                return "缺少成员退出时间，无法人工恢复";
            }
        }
        return "";
    }

    private long count(Long value) {
        return value == null ? 0 : value;
    }

    private String format(LocalDateTime time) {
        return time == null ? "" : DATE_FORMATTER.format(time);
    }

    private String spaceStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case 0:
                return "等待绑定";
            case SPACE_STATUS_NORMAL:
                return "正常";
            case 2:
                return "已冻结";
            case 3:
                return "已归档";
            case 4:
                return "删除等待期";
            case SPACE_STATUS_DELETED:
                return "双方已解绑";
            default:
                return "未知状态";
        }
    }

    private String visibilityText(Integer visibility) {
        if (visibility == null) {
            return "";
        }
        return Objects.equals(visibility, SPACE_VISIBILITY_PUBLIC) ? "公开" : "私密";
    }

    private String memberRoleText(Integer memberRole) {
        if (Objects.equals(memberRole, MEMBER_ROLE_CREATOR)) {
            return "空间发起人";
        }
        if (Objects.equals(memberRole, MEMBER_ROLE_PARTNER)) {
            return "另一半";
        }
        return "成员";
    }

    private String memberStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case MEMBER_STATUS_INVITING:
                return "邀请中";
            case MEMBER_STATUS_ACTIVE:
                return "有效";
            case MEMBER_STATUS_PAUSED:
                return "暂停";
            case MEMBER_STATUS_LEFT:
                return "已退出";
            case MEMBER_STATUS_REMOVED:
                return "已移除";
            default:
                return "未知状态";
        }
    }
}
