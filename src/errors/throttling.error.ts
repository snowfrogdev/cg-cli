/* eslint-disable no-useless-constructor */
export class ThrottlingError extends Error {
  constructor(message: string | undefined) {
    super(message)
  }
}
