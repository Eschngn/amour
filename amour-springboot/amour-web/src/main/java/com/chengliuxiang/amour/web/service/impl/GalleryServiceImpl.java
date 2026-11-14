package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.SpacePublishedItemDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.SpacePublishedItemMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.model.snapshot.AnniversaryPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.PhotoPublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.SpacePublicSnapshot;
import com.chengliuxiang.amour.common.model.snapshot.StoryPublicSnapshot;
import com.chengliuxiang.amour.common.utils.JsonUtil;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 恋爱广场读取服务。
 *
 * <p>只读取 space_published_item 中审核通过且未下架的公开快照；
 * 待审核、驳回、撤回、管理员下架以及私密空间的内容都不会进入返回体。
 * 功能上线前已经公开的历史空间没有快照，首次读取时按当前公开数据兼容展示，
 * 一旦用户编辑公开内容，系统会先固化旧版本再进入审核。</p>
 */
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

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

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
    @Resource
    private SpacePublishedItemMapper publishedItemMapper;

    @Override
    public Response<PageResult<GallerySpaceCardVO>> pagePublicSpaces(GallerySpacePageQueryReqVO reqVO) {
        long current = normalizeCurrent(reqVO == null ? null : reqVO.getCurrent());
        long size = normalizeSize(reqVO == null ? null : reqVO.getSize());

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
                        loadSnapshotData(space),
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

        GallerySnapshotData data = loadSnapshotData(space);
        List<GalleryStoryDetailVO> stories = toStoryDetailVOs(data.stories);
        List<GalleryPhotoVO> photos = toPhotoVOs(data.photos);
        List<GalleryAnniversaryVO> anniversaries = toAnniversaryVOs(data.anniversaries);

        GalleryStorySummaryVO latestStory = findLatestStory(data.stories);
        List<GalleryPhotoVO> latestPhotos = toPhotoVOs(limit(
                sortPhotosForLatest(data.photos), LATEST_PHOTO_LIMIT));
        List<GalleryAnniversaryVO> latestAnniversaries = toAnniversaryVOs(limit(
                sortAnniversariesForLatest(data.anniversaries), LATEST_ANNIVERSARY_LIMIT));

        return Response.success(GallerySpaceDetailVO.builder()
                .spaceId(spaceId)
                .spaceName(data.space.getSpaceName())
                .description(data.space.getDescription())
                .coverImage(resolveCoverImage(data, latestPhotos, latestStory))
                .loveStartTime(parseDateTime(data.space.getLoveStartTime()))
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
                                         GallerySnapshotData data,
                                         List<CoupleMemberDO> memberDOs,
                                         Map<Long, UserDO> userMap) {
        List<GallerySpaceMemberVO> members = buildMemberVOs(memberDOs, userMap);
        GalleryStorySummaryVO latestStory = findLatestStory(data.stories);
        List<GalleryPhotoVO> latestPhotos = toPhotoVOs(limit(
                sortPhotosForLatest(data.photos), LATEST_PHOTO_LIMIT));
        List<GalleryAnniversaryVO> latestAnniversaries = toAnniversaryVOs(limit(
                sortAnniversariesForLatest(data.anniversaries), LATEST_ANNIVERSARY_LIMIT));

        return GallerySpaceCardVO.builder()
                .spaceId(space.getId())
                .spaceName(data.space.getSpaceName())
                .description(data.space.getDescription())
                .coverImage(resolveCoverImage(data, latestPhotos, latestStory))
                .loveStartTime(parseDateTime(data.space.getLoveStartTime()))
                .memberCount(members.size())
                .members(members)
                .publicStoryCount((long) data.stories.size())
                .publicPhotoCount((long) data.photos.size())
                .publicAnniversaryCount((long) data.anniversaries.size())
                .latestStory(latestStory)
                .latestPhotos(latestPhotos)
                .latestAnniversaries(latestAnniversaries)
                .build();
    }

    /**
     * 读取空间广场数据：优先使用已发布快照，历史公开空间才回退到当前公开数据。
     */
    private GallerySnapshotData loadSnapshotData(CoupleSpaceDO space) {
        Long spaceId = space.getId();
        List<SpacePublishedItemDO> published = publishedItemMapper.selectPublishedBySpaceId(spaceId);
        if (CollUtil.isNotEmpty(published)) {
            SpacePublicSnapshot spaceSnapshot = null;
            List<StoryPublicSnapshot> stories = new ArrayList<>();
            List<PhotoPublicSnapshot> photos = new ArrayList<>();
            List<AnniversaryPublicSnapshot> anniversaries = new ArrayList<>();
            for (SpacePublishedItemDO item : published) {
                if (SpaceReviewConstants.ITEM_TYPE_SPACE.equals(item.getItemType())) {
                    spaceSnapshot = JsonUtil.parseObject(item.getSnapshotJson(), SpacePublicSnapshot.class);
                } else if (SpaceReviewConstants.ITEM_TYPE_STORY.equals(item.getItemType())) {
                    addIfNotNull(stories, JsonUtil.parseObject(item.getSnapshotJson(), StoryPublicSnapshot.class));
                } else if (SpaceReviewConstants.ITEM_TYPE_PHOTO.equals(item.getItemType())) {
                    addIfNotNull(photos, JsonUtil.parseObject(item.getSnapshotJson(), PhotoPublicSnapshot.class));
                } else if (SpaceReviewConstants.ITEM_TYPE_ANNIVERSARY.equals(item.getItemType())) {
                    addIfNotNull(anniversaries,
                            JsonUtil.parseObject(item.getSnapshotJson(), AnniversaryPublicSnapshot.class));
                }
            }
            if (spaceSnapshot == null) {
                spaceSnapshot = toSpaceSnapshot(space);
            }
            sortStories(stories);
            sortPhotos(photos);
            sortAnniversaries(anniversaries);
            return new GallerySnapshotData(spaceSnapshot, stories, photos, anniversaries);
        }
        return loadLiveSnapshotData(space);
    }

    /**
     * 历史公开数据兼容：功能上线前已公开的空间没有审核快照，按当前公开数据展示。
     * 用户第一次修改公开内容时，SpaceReviewService 会先固化这些数据再进入审核。
     */
    private GallerySnapshotData loadLiveSnapshotData(CoupleSpaceDO space) {
        Long spaceId = space.getId();
        List<StoryNodeDO> storyDOs = storyNodeMapper.selectPublicList(spaceId);
        Map<Long, List<StoryNodeImageDO>> imageMap = loadStoryImages(spaceId, storyDOs);
        List<StoryPublicSnapshot> stories = storyDOs.stream()
                .map(story -> toStorySnapshot(story, imageMap.get(story.getId())))
                .collect(Collectors.toList());
        List<PhotoPublicSnapshot> photos = photoMapper.selectPublicList(spaceId).stream()
                .map(this::toPhotoSnapshot)
                .collect(Collectors.toList());
        List<AnniversaryPublicSnapshot> anniversaries = anniversaryMapper.selectPublicList(spaceId).stream()
                .map(this::toAnniversarySnapshot)
                .collect(Collectors.toList());
        sortStories(stories);
        sortPhotos(photos);
        sortAnniversaries(anniversaries);
        return new GallerySnapshotData(toSpaceSnapshot(space), stories, photos, anniversaries);
    }

    private Map<Long, List<StoryNodeImageDO>> loadStoryImages(Long spaceId, List<StoryNodeDO> stories) {
        if (CollUtil.isEmpty(stories)) {
            return Collections.emptyMap();
        }
        List<Long> nodeIds = stories.stream()
                .map(StoryNodeDO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (nodeIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<StoryNodeImageDO> images = storyNodeImageMapper.selectByNodeIds(spaceId, nodeIds);
        if (CollUtil.isEmpty(images)) {
            return Collections.emptyMap();
        }
        return images.stream()
                .filter(image -> image.getNodeId() != null && StrUtil.isNotBlank(image.getUrl()))
                .collect(Collectors.groupingBy(StoryNodeImageDO::getNodeId));
    }

    private SpacePublicSnapshot toSpaceSnapshot(CoupleSpaceDO space) {
        return SpacePublicSnapshot.builder()
                .spaceId(space.getId())
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .description(space.getDescription())
                .coverImage(space.getCoverImage())
                .loveStartTime(format(space.getLoveStartTime()))
                .publicAt(format(space.getPublicAt()))
                .build();
    }

    private StoryPublicSnapshot toStorySnapshot(StoryNodeDO story, List<StoryNodeImageDO> images) {
        return StoryPublicSnapshot.builder()
                .storyId(story.getId())
                .chapterId(story.getChapterId())
                .title(story.getTitle())
                .summary(story.getSummary())
                .content(story.getContent())
                .happenedTime(format(story.getHappenedTime()))
                .location(story.getLocation())
                .coverImage(story.getCoverImage())
                .tagLabel(story.getTagLabel())
                .tagColor(story.getTagColor())
                .sortOrder(story.getSortOrder())
                .milestone(Boolean.TRUE.equals(story.getIsMilestone()))
                .images(CollUtil.isEmpty(images) ? Collections.emptyList() : images.stream()
                        .map(image -> StoryPublicSnapshot.ImagePublicSnapshot.builder()
                                .url(image.getUrl())
                                .altText(StrUtil.nullToEmpty(image.getAltText()))
                                .sortOrder(image.getSortOrder())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    private PhotoPublicSnapshot toPhotoSnapshot(PhotoDO photo) {
        return PhotoPublicSnapshot.builder()
                .photoId(photo.getId())
                .photoCategoryId(photo.getPhotoCategoryId())
                .title(photo.getTitle())
                .description(photo.getDescription())
                .url(photo.getUrl())
                .takenTime(format(photo.getTakenTime()))
                .location(photo.getLocation())
                .sortOrder(photo.getSortOrder())
                .cover(Boolean.TRUE.equals(photo.getIsCover()))
                .build();
    }

    private AnniversaryPublicSnapshot toAnniversarySnapshot(AnniversaryDO anniversary) {
        return AnniversaryPublicSnapshot.builder()
                .anniversaryId(anniversary.getId())
                .title(anniversary.getTitle())
                .description(anniversary.getDescription())
                .anniversaryDate(format(anniversary.getAnniversaryDate()))
                .repeatType(anniversary.getRepeatType())
                .category(anniversary.getCategory())
                .colorCode(anniversary.getColorCode())
                .location(anniversary.getLocation())
                .sortOrder(anniversary.getSortOrder())
                .build();
    }

    private List<GalleryStoryDetailVO> toStoryDetailVOs(List<StoryPublicSnapshot> stories) {
        return stories.stream()
                .map(story -> GalleryStoryDetailVO.builder()
                        .storyId(story.getStoryId())
                        .title(story.getTitle())
                        .summary(story.getSummary())
                        .content(story.getContent())
                        .happenedTime(parseDateTime(story.getHappenedTime()))
                        .location(story.getLocation())
                        .coverImage(story.getCoverImage())
                        .tagLabel(story.getTagLabel())
                        .tagColor(story.getTagColor())
                        .isMilestone(story.getMilestone())
                        .images(toStoryImageVOs(story.getImages()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<GalleryStoryImageVO> toStoryImageVOs(
            List<StoryPublicSnapshot.ImagePublicSnapshot> images) {
        if (CollUtil.isEmpty(images)) {
            return Collections.emptyList();
        }
        return images.stream()
                .filter(image -> StrUtil.isNotBlank(image.getUrl()))
                .map(image -> GalleryStoryImageVO.builder()
                        .url(image.getUrl())
                        .altText(StrUtil.nullToEmpty(image.getAltText()))
                        .build())
                .collect(Collectors.toList());
    }

    private List<GalleryPhotoVO> toPhotoVOs(List<PhotoPublicSnapshot> photos) {
        if (CollUtil.isEmpty(photos)) {
            return Collections.emptyList();
        }
        return photos.stream()
                .map(photo -> GalleryPhotoVO.builder()
                        .photoId(photo.getPhotoId())
                        .title(photo.getTitle())
                        .description(photo.getDescription())
                        .url(photo.getUrl())
                        .takenTime(parseDateTime(photo.getTakenTime()))
                        .location(photo.getLocation())
                        .isCover(photo.getCover())
                        .build())
                .collect(Collectors.toList());
    }

    private List<GalleryAnniversaryVO> toAnniversaryVOs(List<AnniversaryPublicSnapshot> anniversaries) {
        if (CollUtil.isEmpty(anniversaries)) {
            return Collections.emptyList();
        }
        return anniversaries.stream()
                .map(anniversary -> GalleryAnniversaryVO.builder()
                        .anniversaryId(anniversary.getAnniversaryId())
                        .title(anniversary.getTitle())
                        .description(anniversary.getDescription())
                        .anniversaryDate(parseDate(anniversary.getAnniversaryDate()))
                        .repeatType(anniversary.getRepeatType())
                        .category(anniversary.getCategory())
                        .colorCode(anniversary.getColorCode())
                        .location(anniversary.getLocation())
                        .build())
                .collect(Collectors.toList());
    }

    private GalleryStorySummaryVO findLatestStory(List<StoryPublicSnapshot> stories) {
        if (CollUtil.isEmpty(stories)) {
            return null;
        }
        StoryPublicSnapshot story = stories.stream()
                .max(Comparator.comparing(item -> StrUtil.nullToEmpty(item.getHappenedTime())))
                .orElse(stories.get(0));
        return GalleryStorySummaryVO.builder()
                .storyId(story.getStoryId())
                .title(story.getTitle())
                .summary(story.getSummary())
                .happenedTime(parseDateTime(story.getHappenedTime()))
                .coverImage(story.getCoverImage())
                .tagLabel(story.getTagLabel())
                .tagColor(story.getTagColor())
                .isMilestone(story.getMilestone())
                .build();
    }

    private List<StoryPublicSnapshot> sortStories(List<StoryPublicSnapshot> stories) {
        stories.sort(Comparator
                .comparing((StoryPublicSnapshot item) -> item.getChapterId() == null
                        ? Long.MAX_VALUE : item.getChapterId())
                .thenComparing(item -> item.getSortOrder() == null ? 0 : item.getSortOrder())
                .thenComparing(item -> StrUtil.nullToEmpty(item.getHappenedTime()))
                .thenComparing(item -> item.getStoryId() == null ? Long.MAX_VALUE : item.getStoryId()));
        return stories;
    }

    private List<PhotoPublicSnapshot> sortPhotos(List<PhotoPublicSnapshot> photos) {
        photos.sort(Comparator
                .comparing((PhotoPublicSnapshot item) -> item.getSortOrder() == null ? 0 : item.getSortOrder())
                .thenComparing(item -> StrUtil.nullToEmpty(item.getTakenTime()), Comparator.reverseOrder())
                .thenComparing(item -> item.getPhotoId() == null ? Long.MAX_VALUE : item.getPhotoId(),
                        Comparator.reverseOrder()));
        return photos;
    }

    private List<PhotoPublicSnapshot> sortPhotosForLatest(List<PhotoPublicSnapshot> photos) {
        List<PhotoPublicSnapshot> sorted = new ArrayList<>(photos);
        sorted.sort(Comparator
                .comparing((PhotoPublicSnapshot item) -> StrUtil.nullToEmpty(item.getTakenTime()),
                        Comparator.reverseOrder())
                .thenComparing(item -> item.getPhotoId() == null ? Long.MAX_VALUE : item.getPhotoId(),
                        Comparator.reverseOrder()));
        return sorted;
    }

    private List<AnniversaryPublicSnapshot> sortAnniversaries(
            List<AnniversaryPublicSnapshot> anniversaries) {
        anniversaries.sort(Comparator
                .comparing((AnniversaryPublicSnapshot item) -> item.getSortOrder() == null ? 0 : item.getSortOrder())
                .thenComparing(item -> StrUtil.nullToEmpty(item.getAnniversaryDate()))
                .thenComparing(item -> item.getAnniversaryId() == null
                        ? Long.MAX_VALUE : item.getAnniversaryId()));
        return anniversaries;
    }

    private List<AnniversaryPublicSnapshot> sortAnniversariesForLatest(
            List<AnniversaryPublicSnapshot> anniversaries) {
        List<AnniversaryPublicSnapshot> sorted = new ArrayList<>(anniversaries);
        sorted.sort(Comparator
                .comparing((AnniversaryPublicSnapshot item) -> StrUtil.nullToEmpty(item.getAnniversaryDate()),
                        Comparator.reverseOrder())
                .thenComparing(item -> item.getAnniversaryId() == null
                        ? Long.MAX_VALUE : item.getAnniversaryId(), Comparator.reverseOrder()));
        return sorted;
    }

    private <T> List<T> limit(List<T> source, int limit) {
        if (source.size() <= limit) {
            return source;
        }
        return new ArrayList<>(source.subList(0, limit));
    }

    private CoupleSpaceDO requirePublicSpace(Long spaceId) {
        CoupleSpaceDO publicSpace = coupleSpaceMapper.selectPublicById(spaceId);
        if (publicSpace != null) {
            return publicSpace;
        }
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        if (!Integer.valueOf(SPACE_VISIBILITY_PUBLIC).equals(space.getVisibility())) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_PUBLIC);
        }
        if (Integer.valueOf(SPACE_STATUS_WAITING).equals(space.getStatus())
                || Integer.valueOf(SPACE_STATUS_FROZEN).equals(space.getStatus())
                || Integer.valueOf(SPACE_STATUS_ARCHIVED).equals(space.getStatus())) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_PUBLIC);
        }
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

    private String resolveCoverImage(GallerySnapshotData data,
                                     List<GalleryPhotoVO> latestPhotos,
                                     GalleryStorySummaryVO latestStory) {
        if (StrUtil.isNotBlank(data.space.getCoverImage())) {
            return data.space.getCoverImage().trim();
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

    private <T> void addIfNotNull(List<T> target, T value) {
        if (value != null) {
            target.add(value);
        }
    }

    private String format(LocalDateTime value) {
        return value == null ? null : value.format(DATE_TIME_FORMATTER);
    }

    private String format(LocalDate value) {
        return value == null ? null : value.format(DATE_FORMATTER);
    }

    private LocalDateTime parseDateTime(String value) {
        if (StrUtil.isBlank(value)) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.trim(), DATE_TIME_FORMATTER);
        } catch (Exception exception) {
            return null;
        }
    }

    private LocalDate parseDate(String value) {
        if (StrUtil.isBlank(value)) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim(), DATE_FORMATTER);
        } catch (Exception exception) {
            return null;
        }
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

    /**
     * 单个空间的广场数据视图。
     */
    private static final class GallerySnapshotData {

        private final SpacePublicSnapshot space;

        private final List<StoryPublicSnapshot> stories;

        private final List<PhotoPublicSnapshot> photos;

        private final List<AnniversaryPublicSnapshot> anniversaries;

        private GallerySnapshotData(SpacePublicSnapshot space, List<StoryPublicSnapshot> stories,
                                    List<PhotoPublicSnapshot> photos,
                                    List<AnniversaryPublicSnapshot> anniversaries) {
            this.space = space;
            this.stories = stories;
            this.photos = photos;
            this.anniversaries = anniversaries;
        }
    }
}
