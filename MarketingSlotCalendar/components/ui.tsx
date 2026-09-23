import * as React from "react";

type IconProps = { size?: number; className?: string };

/** Lucide-style stroke icons (the Blibli design system standardises on Lucide). */
function icon(children: React.ReactNode): React.FC<IconProps> {
    const Icon: React.FC<IconProps> = ({ size = 16, className }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
            {children}
        </svg>
    );
    return Icon;
}

export const ChevronLeft = icon(<path d="m15 18-6-6 6-6" />);
export const ChevronRight = icon(<path d="m9 18 6-6-6-6" />);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
export const CloseIcon = icon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const EditIcon = icon(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
export const TrashIcon = icon(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>);
export const CalendarIcon = icon(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>);
export const AlertIcon = icon(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>);
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);
export const InfoIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>);
export const LockIcon = icon(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
export const GripIcon = icon(<><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>);

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

export const Badge: React.FC<{ tone: Tone; children: React.ReactNode; title?: string }> = ({ tone, children, title }) => (
    <span className={`msc-badge msc-badge--${tone}`} title={title}>
        {children}
    </span>
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "ghost" | "danger" | "subtle" | "text";
    size?: "sm" | "md";
    block?: boolean;
    icon?: React.ReactNode;
};

export const Button: React.FC<ButtonProps> = ({ variant = "ghost", size = "md", block, icon: ic, className, children, type, ...rest }) => (
    <button
        type={type ?? "button"}
        className={["msc-btn", `msc-btn--${variant}`, size === "sm" ? "msc-btn--sm" : "", block ? "msc-btn--block" : "", className ?? ""].filter(Boolean).join(" ")}
        {...rest}
    >
        {ic}
        {children !== undefined && <span>{children}</span>}
    </button>
);

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({ label, className, children, ...rest }) => (
    <button type="button" aria-label={label} title={label} className={`msc-icon-btn ${className ?? ""}`} {...rest}>
        {children}
    </button>
);

export interface SegOption<T extends string> {
    value: T;
    label: string;
}

export function Segmented<T extends string>(props: { options: SegOption<T>[]; value: T; onChange: (v: T) => void; label: string }): React.ReactElement {
    return (
        <div className="msc-seg" role="radiogroup" aria-label={props.label}>
            {props.options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={o.value === props.value}
                    className={o.value === props.value ? "is-on" : ""}
                    onClick={() => props.onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** Modal rendered inside the control (no portal: canvas apps sandbox the control's DOM). */
export const Modal: React.FC<{ title: string; subtitle?: string; onClose: () => void; footer: React.ReactNode; width?: number; children: React.ReactNode }> = ({
    title,
    subtitle,
    onClose,
    footer,
    width = 520,
    children
}) => {
    const ref = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not(.msc-modal__x)");
        first?.focus();
    }, []);
    return (
        <div className="msc-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div
                ref={ref}
                className="msc-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                style={{ maxWidth: width }}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        e.stopPropagation();
                        onClose();
                    }
                }}
            >
                <div className="msc-modal__head">
                    <div>
                        <h2>{title}</h2>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <IconButton label="Close" className="msc-modal__x" onClick={onClose}>
                        <CloseIcon size={18} />
                    </IconButton>
                </div>
                <div className="msc-modal__body">{children}</div>
                <div className="msc-modal__foot">{footer}</div>
            </div>
        </div>
    );
};

export interface ToastMsg {
    id: number;
    tone: "ok" | "bad" | "info";
    title: string;
    body?: string;
}

export const Toasts: React.FC<{ items: ToastMsg[]; onDismiss: (id: number) => void }> = ({ items, onDismiss }) => (
    <div className="msc-toasts" aria-live="polite">
        {items.map((t) => (
            <div key={t.id} className={`msc-toast msc-toast--${t.tone}`} role="status">
                <span className="msc-toast__icon">{t.tone === "ok" ? <CheckIcon size={16} /> : t.tone === "bad" ? <AlertIcon size={16} /> : <InfoIcon size={16} />}</span>
                <div className="msc-toast__text">
                    <strong>{t.title}</strong>
                    {t.body && <span>{t.body}</span>}
                </div>
                <IconButton label="Dismiss" onClick={() => onDismiss(t.id)}>
                    <CloseIcon size={14} />
                </IconButton>
            </div>
        ))}
    </div>
);

export const Meter: React.FC<{ pct: number; level: string }> = ({ pct, level }) => (
    <span className={`msc-meter msc-meter--${level}`} aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
);
