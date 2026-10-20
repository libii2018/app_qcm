import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({ 
  checked, 
  onChange, 
  className,
  ...props 
}, ref) => {
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
        className
      )}
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
});

Switch.displayName = 'Switch';
