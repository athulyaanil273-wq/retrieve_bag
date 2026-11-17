import { useEffect, useId, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Dialog surface */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 w-full rounded-[20px] bg-navy-850 border border-lavender-300/20 p-6 shadow-2xl',
              maxWidthClass
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 id={titleId} className="text-xl font-semibold text-slate-50">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="text-sm text-slate-300">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="min-w-11 min-h-11 -mt-2 -mr-2 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-navy-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5">{children}</div>

            {footer && (
              <div className="mt-6 pt-4 border-t border-lavender-300/12 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
