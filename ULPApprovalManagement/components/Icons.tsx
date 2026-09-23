import * as React from "react";

interface IconProps {
    size?: number;
    className?: string;
}

/** Lucide-style stroke icons (the Blibli design system standardises on Lucide). */
function make(children: React.ReactNode): React.FC<IconProps> {
    const Icon: React.FC<IconProps> = ({ size = 16, className }) => (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            {children}
        </svg>
    );
    return Icon;
}

export const SearchIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
export const FilterIcon = make(<path d="M3 5h18l-7 8v6l-4 2v-8Z" />);
export const RefreshIcon = make(<><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 4v6h-6" /></>);
export const CloseIcon = make(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const CheckIcon = make(<path d="M20 6 9 17l-5-5" />);
export const XCircleIcon = make(<><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>);
export const CalendarEditIcon = make(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m13.5 14.5 2 2-3.5 3.5h-2v-2Z" /></>);
export const CalendarIcon = make(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>);
export const UndoIcon = make(<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>);
export const BackIcon = make(<path d="m15 18-6-6 6-6" />);
export const InboxIcon = make(<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></>);
export const AlertIcon = make(<><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></>);
export const LayersIcon = make(<><path d="m12 2 10 5-10 5L2 7Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>);
export const HistoryIcon = make(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>);
export const MessageIcon = make(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />);
export const UserIcon = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const ClockIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const InfoIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>);
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />);
export const SpinnerIcon = make(<path d="M21 12a9 9 0 1 1-6.22-8.56" />);
export const MapPinIcon = make(<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>);
