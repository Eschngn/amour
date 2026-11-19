export interface SpaceHomeView {
  spaceName: string
  boyName: string
  girlName: string
  boyAvatar: string
  girlAvatar: string
  heroPhotoOne: string
  heroPhotoTwo: string
  loveStartTime: string
  loveStartDate: string
  boyInitial: string
  girlInitial: string
}

export function buildHomeView(home: Record<string, unknown> | null | undefined): SpaceHomeView
export function formatLoveStartDate(value: unknown): string
export function initialOf(name: unknown, fallback: string): string
