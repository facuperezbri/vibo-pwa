'use client'

import * as React from 'react'
import PhoneInputWithCountry, { type Country } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'
import { Phone } from 'lucide-react'

type PhoneInputWithCountryProps = React.ComponentProps<typeof PhoneInputWithCountry>

interface CustomPhoneInputProps extends Omit<PhoneInputWithCountryProps, 'className' | 'value' | 'onChange'> {
  className?: string
  error?: boolean
  value?: string
  onChange?: (value: string | undefined) => void
  showIcon?: boolean
}

const PhoneInput = React.forwardRef<React.ElementRef<typeof PhoneInputWithCountry>, CustomPhoneInputProps>(
  ({ className, error, showIcon = true, value, onChange, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        {showIcon && (
          <Phone className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        )}
        <PhoneInputWithCountry
          {...props}
          ref={ref}
          international
          defaultCountry="AR"
          value={value}
          onChange={onChange}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            showIcon && 'pl-10 pr-3',
            !showIcon && 'px-3',
            error && 'border-destructive focus-visible:ring-destructive',
            // Reset PhoneInput default styles
            '[&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:ring-0 [&_.PhoneInputInput]:focus:ring-0 [&_.PhoneInputInput]:focus-visible:ring-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:h-full [&_.PhoneInputInput]:py-1',
            // Style country selector
            '[&_.PhoneInputCountry]:mr-2 [&_.PhoneInputCountrySelect]:border-0 [&_.PhoneInputCountrySelect]:bg-transparent [&_.PhoneInputCountrySelect]:outline-none [&_.PhoneInputCountrySelect]:ring-0 [&_.PhoneInputCountrySelect]:focus:ring-0 [&_.PhoneInputCountrySelect]:focus-visible:ring-0 [&_.PhoneInputCountrySelect]:cursor-pointer [&_.PhoneInputCountrySelect]:text-sm',
            '[&_.PhoneInputCountryIcon]:border-0 [&_.PhoneInputCountryIcon]:rounded-sm [&_.PhoneInputCountryIcon]:w-5 [&_.PhoneInputCountryIcon]:h-5',
            // Adjust padding when icon is shown
            showIcon && '[&_.PhoneInputCountry]:ml-0'
          )}
        />
      </div>
    )
  }
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
export type { CustomPhoneInputProps as PhoneInputProps, Country }

