import { Label, ListBox, Select } from '@heroui/react'

interface OptionSelectProps<T extends string | number> {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
}

/** Compact labelled dropdown used for the session options on the home screen. */
export function OptionSelect<T extends string | number>(props: OptionSelectProps<T>) {
  return (
    <Select
      className="min-w-0"
      variant="secondary"
      value={props.value}
      onChange={(key) => props.onChange(key as T)}
    >
      <Label className="text-muted text-xs">{props.label}</Label>
      <Select.Trigger>
        <Select.Value className="truncate" />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {props.options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
