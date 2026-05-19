declare global {
  var __otpStore: Record<string, { otp: string; expiry: number }> | undefined
}
export {}