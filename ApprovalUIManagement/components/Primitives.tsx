import * as React from "react";
import { Tone } from "../lib/types";
import { avatarTone, displayName, initials } from "../lib/format";
import { copyText } from "../lib/copy";
import { AlertIcon, CheckIcon, CopyIcon, InboxIcon, SpinnerIcon } from "./Icons";

export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(" ");

export const Badge: React.FC<{ tone: Tone; label: string; dot?: boolean }> = ({ tone, label, dot }) => (
    <span className={cx("uam-badge", `uam-badge--${tone}`)}>
        {dot && <span className="uam-badge__dot" />}
        {label.trim().length > 0 ? label : "—"}
    </span>
);

/** Request-type chip, coloured the way the dashboard mockup colours the three ULP types. */
export const TypeChip: React.FC<{ type?: string }> = ({ type }) => {
    if (!type) return null;
    const t = type.toLowerCase();
    const variant = t.indexOf("gamification") !== -1 ? "magenta" : t.indexOf("campaign") !== -1 ? "blue" : t.indexOf("slot") !== -1 ? "orange" : "gray";
    return <span className={cx("uam-type", `uam-type--${variant}`)}>{type}</span>;
};

export const Avatar: React.FC<{ name?: string; size?: "sm" | "md" }> = ({ name, size = "md" }) => (
    <span className={cx("uam-avatar", `uam-avatar--${avatarTone(name)}`, size === "sm" && "uam-avatar--sm")} title={displayName(name)}>
        {initials(name)}
    </span>
);

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "danger-ghost" | "subtle";

export const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md"; icon?: React.ReactNode; busy?: boolean }
> = ({ variant = "outline", size = "md", icon, busy, className, children, disabled, ...rest }) => (
    <button
        type="button"
        className={cx("uam-btn", `uam-btn--${variant}`, size === "sm" && "uam-btn--sm", className)}
        disabled={disabled || busy}
        {...rest}
    >
        {busy ? <SpinnerIcon size={size === "sm" ? 14 : 16} className="uam-spin" /> : icon}
        {children}
    </button>
);

export const Skeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
    <div className="uam-skeleton" role="status" aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => (
            <div className="uam-skeleton__row" key={i}>
                <span className="uam-skeleton__circle" />
                <span className="uam-skeleton__lines">
                    <span className="uam-skeleton__line" />
                    <span className="uam-skeleton__line uam-skeleton__line--short" />
                </span>
            </div>
        ))}
    </div>
);

export const EmptyState: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({
    title,
    subtitle,
    icon,
    action
}) => (
    <div className="uam-empty">
        <span className="uam-empty__icon">{icon ?? <InboxIcon size={28} />}</span>
        <p className="uam-empty__title">{title}</p>
        {subtitle && <p className="uam-empty__subtitle">{subtitle}</p>}
        {action}
    </div>
);

export const ErrorState: React.FC<{ message: string; title?: string }> = ({ message, title = "Unable to load approvals" }) => (
    <div className="uam-empty uam-empty--error" role="alert">
        <span className="uam-empty__icon">
            <AlertIcon size={28} />
        </span>
        <p className="uam-empty__title">{title}</p>
        <p className="uam-empty__subtitle">{message}</p>
    </div>
);

/** Segmented progress: approved / changed / rejected / pending. */
export const DecisionBar: React.FC<{ approved: number; changed: number; rejected: number; total: number }> = ({
    approved,
    changed,
    rejected,
    total
}) => {
    if (total <= 0) return null;
    const pct = (n: number): string => `${(n / total) * 100}%`;
    return (
        <div className="uam-decision-bar" aria-hidden="true">
            <span className="uam-decision-bar__seg uam-decision-bar__seg--approved" style={{ width: pct(approved) }} />
            <span className="uam-decision-bar__seg uam-decision-bar__seg--changed" style={{ width: pct(changed) }} />
            <span className="uam-decision-bar__seg uam-decision-bar__seg--rejected" style={{ width: pct(rejected) }} />
        </div>
    );
};

/**
 * Copies `text` and confirms in place (check mark for 2 s). When the browser refuses the clipboard,
 * the button says so; the text itself stays selectable for Ctrl+C.
 */
export const CopyButton: React.FC<{ text: string; label: string; children?: React.ReactNode; className?: string }> = ({ text, label, children, className }) => {
    const [state, setState] = React.useState<"idle" | "done" | "failed">("idle");
    React.useEffect(() => {
        if (state === "idle") return;
        const t = window.setTimeout(() => setState("idle"), 2000);
        return () => window.clearTimeout(t);
    }, [state]);
    const tip = state === "done" ? "Copied" : state === "failed" ? "Copy was blocked: select the text and press Ctrl+C" : label;
    return (
        <button
            type="button"
            className={cx("uam-copy", children ? "uam-copy--text" : undefined, state !== "idle" && `uam-copy--${state}`, className)}
            title={tip}
            aria-label={tip}
            onClick={(e) => {
                e.stopPropagation();
                const host = e.currentTarget.closest<HTMLElement>(".uam-root");
                void copyText(text, host).then((ok) => setState(ok ? "done" : "failed"));
            }}
        >
            {state === "done" ? <CheckIcon size={14} /> : state === "failed" ? <AlertIcon size={14} /> : <CopyIcon size={14} />}
            {children && <span>{state === "done" ? "Copied" : children}</span>}
        </button>
    );
};
