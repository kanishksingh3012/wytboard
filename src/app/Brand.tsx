export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-7" />
      <span className="text-foreground text-base font-semibold tracking-tight">Wytboard</span>
    </span>
  )
}
