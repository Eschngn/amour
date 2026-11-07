package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.gallery.GalleryAnniversaryVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GalleryPhotoVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceCardVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceMemberVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpacePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GalleryStoryDetailVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GalleryStoryImageVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GalleryStorySummaryVO;
import com.chengliuxiang.amour.web.service.GalleryService;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GalleryServiceImpl implements GalleryService {

    private static final long DEFAULT_PAGE_SIZE = 10L;
    private static final long MAX_PAGE_SIZE = 50L;

    private static final int SPACE_STATUS_WAITING = 0;
    private static final int SPACE_STATUS_FROZEN = 2;
    private static final int SPACE_STATUS_ARCHIVED = 3;
    private static final int SPACE_VISIBILITY_PUBLIC = 1;

    private static final int LATEST_STORY_LIMIT = 1;
    private static final int LATEST_PHOTO_LIMIT = 3;
    private static final int LATEST_ANNIVERSARY_LIMIT = 3;

    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private CoupleMemberMapper coupleMemberMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryNodeImageMapper storyNodeImageMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;

    @Override
    public Response<PageResult<GallerySpaceCardVO>> pagePublicSpaces(GallerySpacePageQueryReqVO reqVO) {
        long current = normalizeCurrent(reqVO == null ? null : reqVO.getCurrent());
        long size = normalizeSize(reqVO == null ? null : reqVO.getSize());

        // 公开查询方法本身只匹配 status=1、visibility=1 的空间，避免在 Service 中重复拼条件。
        IPage<CoupleSpaceDO> spacePage = coupleSpaceMapper.selectPublicPage(current, size);
        List<CoupleSpaceDO> spaces = spacePage.getRecords();
        if (CollUtil.isEmpty(spaces)) {
            return Response.success(PageResult.<GallerySpaceCardVO>builder()
                    .current(spacePage.getCurrent())
                    .size(spacePage.getSize())
                    .total(spacePage.getTotal())
                    .records(Collections.emptyList())
                    .build());
        }

        List<Long> spaceIds = spaces.stream()
                .map(CoupleSpaceDO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        List<CoupleMemberDO> allMembers = coupleMemberMapper.selectActiveBySpaceIds(spaceIds);
        if (allMembers == null) {
            allMembers = Collections.emptyList();
        }
        Map<Long, List<CoupleMemberDO>> membersBySpace = allMembers.stream()
                .filter(member -> member.getSpaceId() != null)
                .collect(Collectors.groupingBy(CoupleMemberDO::getSpaceId));
        Set<Long> userIds = allMembers.stream()
                .map(CoupleMemberDO::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, UserDO> userMap = loadUserMap(userIds);

        List<GallerySpaceCardVO> records = spaces.stream()
                .map(space -> buildCard(space,
                        membersBySpace.getOrDefault(space.getId(), Collections.emptyList()), userMap))
                .collect(Collectors.toList());

        return Response.success(PageResult.<GallerySpaceCardVO>builder()
                .current(spacePage.getCurrent())
                .size(spacePage.getSize())
                .total(spacePage.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<GallerySpaceDetailVO> getPublicSpaceDetail(GallerySpaceDetailReqVO reqVO) {
        if (reqVO == null || reqVO.getSpaceId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        CoupleSpaceDO space = requirePublicSpace(reqVO.getSpaceId());
        Long spaceId = space.getId();

        List<CoupleMemberDO> memberDOs = coupleMemberMapper.selectActiveBySpaceId(spaceId);
        if (memberDOs == null) {
            memberDOs = Collections.emptyList();
        }
        Set<Long> userIds = memberDOs.stream()
                .map(CoupleMemberDO::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<GallerySpaceMemberVO> members = buildMemberVOs(memberDOs, loadUserMap(userIds));

        // 详情只查公开内容，私密/隐藏内容不会进入返回体。
        List<StoryNodeDO> storyDOs = storyNodeMapper.selectPublicList(spaceId);
        List<PhotoDO> photoDOs = photoMapper.selectPublicList(spaceId);
        List<AnniversaryDO> anniversaryDOs = anniversaryMapper.selectPublicList(spaceId);

        List<GalleryStoryDetailVO> stories = buildStoryDetailVOs(spaceId, storyDOs);
        List<GalleryPhotoVO> photos = toPhotoVOs(photoDOs);
        List<GalleryAnniversaryVO> anniversaries = toAnniversaryVOs(anniversaryDOs);

        GalleryStorySummaryVO latestStory = findLatestStory(spaceId);
        List<GalleryPhotoVO> latestPhotos = toPhotoVOs(
                photoMapper.selectLatestPublic(spaceId, LATEST_PHOTO_LIMIT));
        List<GalleryAnniversaryVO> latestAnniversaries = toAnniversaryVOs(
                anniversaryMapper.selectLatestPublic(spaceId, LATEST_ANNIVERSARY_LIMIT));

        return Response.success(GallerySpaceDetailVO.builder()
                .spaceId(space.getId())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(resolveCoverImage(space, latestPhotos, latestStory))
                .loveStartTime(space.getLoveStartTime())
                .memberCount(members.size())
                .members(members)
                .publicStoryCount((long) stories.size())
                .publicPhotoCount((long) photos.size())
                .publicAnniversaryCount((long) anniversaries.size())
                .latestStory(latestStory)
                .latestPhotos(latestPhotos)
                .latestAnniversaries(latestAnniversaries)
                .stories(stories)
                .photos(photos)
                .anniversaries(anniversaries)
                .build());
    }

    private GallerySpaceCardVO buildCard(CoupleSpaceDO space,
                                         List<CoupleMemberDO> memberDOs,
                                         Map<Long, UserDO> userMap) {
        Long spaceId = space.getId();
        List<GallerySpaceMemberVO> members = buildMemberVOs(memberDOs, userMap);
        Long storyCount = zeroIfNull(storyNodeMapper.countPublicBySpaceId(spaceId));
        Long photoCount = zeroIfNull(photoMapper.countPublicBySpaceId(spaceId));
        Long anniversaryCount = zeroIfNull(anniversaryMapper.countPublicBySpaceId(spaceId));
        GalleryStorySummaryVO latestStory = findLatestStory(spaceId);
        List<GalleryPhotoVO> latestPhotos = toPhotoVOs(
                photoMapper.selectLatestPublic(spaceId, LATEST_PHOTO_LIMIT));
        List<GalleryAnniversaryVO> latestAnniversaries = toAnniversaryVOs(
                anniversaryMapper.selectLatestPublic(spaceId, LATEST_ANNIVERSARY_LIMIT));

        return GallerySpaceCardVO.builder()
                .spaceId(space.getId())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(resolveCoverImage(space, latestPhotos, latestStory))
                .loveStartTime(space.getLoveStartTime())
                .memberCount(members.size())
                .members(members)
                .publicStoryCount(storyCount)
                .publicPhotoCount(photoCount)
                .publicAnniversaryCount(anniversaryCount)
                .latestStory(latestStory)
                .latestPhotos(latestPhotos)
                .latestAnniversaries(latestAnniversaries)
                .build();
    }

    private CoupleSpaceDO requirePublicSpace(Long spaceId) {
        // 正常路径直接使用 Mapper 的公开查询方法（status=1 且 visibility=1）。
        CoupleSpaceDO publicSpace = coupleSpaceMapper.selectPublicById(spaceId);
        if (publicSpace != null) {
            return publicSpace;
        }
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        // 隐藏、冻结、归档都属于「未公开」：对外统一返回 20046。
        if (!Integer.valueOf(SPACE_VISIBILITY_PUBLIC).equals(space.getVisibility())) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_PUBLIC);
        }
        if (Integer.valueOf(SPACE_STATUS_WAITING).equals(space.getStatus())
                || Integer.valueOf(SPACE_STATUS_FROZEN).equals(space.getStatus())
                || Integer.valueOf(SPACE_STATUS_ARCHIVED).equals(space.getStatus())) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_PUBLIC);
        }
        // 已解绑(status=5)/删除等待期等非公开状态，或公开查询与原始记录不一致时，按当前不可访问处理。
        // 广场列表只查 status=1，因此这些状态永远不会出现在公开列表中。
        throw new BizException(ResponseCodeEnum.SPACE_NOT_ACCESSIBLE);
    }

    private Map<Long, UserDO> loadUserMap(Collection<Long> userIds) {
        if (CollUtil.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        List<UserDO> users = userMapper.findUsersByIds(userIds);
        if (CollUtil.isEmpty(users)) {
            return Collections.emptyMap();
        }
        return users.stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private List<GallerySpaceMemberVO> buildMemberVOs(List<CoupleMemberDO> members,
                                                       Map<Long, UserDO> userMap) {
        if (CollUtil.isEmpty(members)) {
            return Collections.emptyList();
        }
        return members.stream()
                .map(member -> {
                    UserDO user = userMap.get(member.getUserId());
                    return GallerySpaceMemberVO.builder()
                            .displayName(user == null
                                    ? "恋人" : StrUtil.blankToDefault(user.getDisplayName(), "恋人"))
                            .avatar(user == null ? "" : StrUtil.blankToDefault(user.getAvatar(), ""))
                            .memberRole(member.getMemberRole())
                            .build();
                })
                .collect(Collectors.toList());
    }

    private GalleryStorySummaryVO findLatestStory(Long spaceId) {
        List<StoryNodeDO> latestStories = storyNodeMapper.selectLatestPublic(spaceId, LATEST_STORY_LIMIT);
        return CollUtil.isEmpty(latestStories) ? null : toStorySummary(latestStories.get(0));
    }

    private GalleryStorySummaryVO toStorySummary(StoryNodeDO story) {
        return GalleryStorySummaryVO.builder()
                .storyId(story.getId())
                .title(story.getTitle())
                .summary(story.getSummary())
                .happenedTime(story.getHappenedTime())
                .coverImage(story.getCoverImage())
                .tagLabel(story.getTagLabel())
                .tagColor(story.getTagColor())
                .isMilestone(story.getIsMilestone())
                .build();
    }

    private List<GalleryStoryDetailVO> buildStoryDetailVOs(Long spaceId, List<StoryNodeDO> stories) {
        if (CollUtil.isEmpty(stories)) {
            return Collections.emptyList();
        }
        List<Long> nodeIds = stories.stream()
                .map(StoryNodeDO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        Map<Long, List<StoryNodeImageDO>> imageMap = Collections.emptyMap();
        if (!nodeIds.isEmpty()) {
            List<StoryNodeImageDO> images = storyNodeImageMapper.selectByNodeIds(spaceId, nodeIds);
            if (CollUtil.isNotEmpty(images)) {
                imageMap = images.stream()
                        .filter(image -> image.getNodeId() != null && StrUtil.isNotBlank(image.getUrl()))
                        .collect(Collectors.groupingBy(StoryNodeImageDO::getNodeId));
            }
        }
        final Map<Long, List<StoryNodeImageDO>> imagesByNode = imageMap;
        return stories.stream()
                .map(story -> GalleryStoryDetailVO.builder()
                        .storyId(story.getId())
                        .title(story.getTitle())
                        .summary(story.getSummary())
                        .content(story.getContent())
                        .happenedTime(story.getHappenedTime())
                        .location(story.getLocation())
                        .coverImage(story.getCoverImage())
                        .tagLabel(story.getTagLabel())
                        .tagColor(story.getTagColor())
                        .isMilestone(story.getIsMilestone())
                        .images(toStoryImageVOs(imagesByNode.get(story.getId())))
                        .build())
                .collect(Collectors.toList());
    }

    private List<GalleryStoryImageVO> toStoryImageVOs(List<StoryNodeImageDO> images) {
        if (CollUtil.isEmpty(images)) {
            return Collections.emptyList();
        }
        return images.stream()
                .map(image -> GalleryStoryImageVO.builder()
                        .url(image.getUrl())
                        .altText(StrUtil.blankToDefault(image.getAltText(), ""))
                        .build())
                .collect(Collectors.toList());
    }

    private List<GalleryPhotoVO> toPhotoVOs(List<PhotoDO> photos) {
        if (CollUtil.isEmpty(photos)) {
            return Collections.emptyList();
        }
        return photos.stream()
                .map(photo -> GalleryPhotoVO.builder()
                        .photoId(photo.getId())
                        .title(photo.getTitle())
                        .description(photo.getDescription())
                        .url(photo.getUrl())
                        .takenTime(photo.getTakenTime())
                        .location(photo.getLocation())
                        .isCover(photo.getIsCover())
                        .build())
                .collect(Collectors.toList());
    }

    private List<GalleryAnniversaryVO> toAnniversaryVOs(List<AnniversaryDO> anniversaries) {
        if (CollUtil.isEmpty(anniversaries)) {
            return Collections.emptyList();
        }
        return anniversaries.stream()
                .map(anniversary -> GalleryAnniversaryVO.builder()
                        .anniversaryId(anniversary.getId())
                        .title(anniversary.getTitle())
                        .description(anniversary.getDescription())
                        .anniversaryDate(anniversary.getAnniversaryDate())
                        .repeatType(anniversary.getRepeatType())
                        .category(anniversary.getCategory())
                        .colorCode(anniversary.getColorCode())
                        .location(anniversary.getLocation())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 空间封面为空时，从公开照片或公开故事封面中取一张，保证卡片有可展示的图片。
     */
    private String resolveCoverImage(CoupleSpaceDO space,
                                     List<GalleryPhotoVO> latestPhotos,
                                     GalleryStorySummaryVO latestStory) {
        if (StrUtil.isNotBlank(space.getCoverImage())) {
            return space.getCoverImage().trim();
        }
        if (CollUtil.isNotEmpty(latestPhotos)) {
            GalleryPhotoVO firstPhoto = latestPhotos.get(0);
            if (firstPhoto != null && StrUtil.isNotBlank(firstPhoto.getUrl())) {
                return firstPhoto.getUrl().trim();
            }
        }
        if (latestStory != null && StrUtil.isNotBlank(latestStory.getCoverImage())) {
            return latestStory.getCoverImage().trim();
        }
        return "";
    }

    private Long zeroIfNull(Long value) {
        return value == null ? 0L : value;
    }

    private long normalizeCurrent(Long current) {
        return current == null || current < 1 ? 1L : current;
    }

    private long normalizeSize(Long size) {
        if (size == null || size < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
