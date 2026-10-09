export interface BardhieAPI {
  readonly platform: string
}

declare global {
  interface Window {
    readonly bardhie: BardhieAPI
  }
}
