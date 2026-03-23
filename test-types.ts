type PersonInsert = {
  id?: string
  name: string
  role?: string | null
  num?: number
}

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

const keys: Record<RequiredKeys<PersonInsert>, true> = {
  name: true
}
console.log(keys)
