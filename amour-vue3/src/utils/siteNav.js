import { SPACE_VIEW_MODE } from './spaceState.js'

/**
 * 前台主导航高亮规则。
 *
 * `/` 同时承载“我的情侣空间”和未绑定用户的恋爱广场视图，
 * 因此不能只按 URL 判断当前栏目，必须结合 useFrontendSpace 的 viewMode。
 */
export function resolveSiteNavState(path, viewMode) {
  const currentPath = typeof path === 'string' && path ? path : '/'
  const isPlazaPath = currentPath === '/plaza' || currentPath.startsWith('/plaza/')
  const isRootPath = currentPath === '/'
  const plazaActive = isPlazaPath
    || (isRootPath && viewMode === SPACE_VIEW_MODE.PLAZA)
  return {
    plazaActive,
    // 根路径且不是广场视图时归属“我的情侣空间”，两种模式不会同时高亮。
    homeActive: isRootPath && !plazaActive,
  }
}
