import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { asAllCapsLabel } from '../../lib/greekTypography';

/** Walk React children and strip Greek diacritics from string/number leaves. */
export function mapAllCapsLabelChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return asAllCapsLabel(String(child));
    }
    if (isValidElement(child)) {
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.props.children == null) return child;
      return cloneElement(el, {
        ...el.props,
        children: mapAllCapsLabelChildren(el.props.children),
      });
    }
    return child;
  });
}

/**
 * OPT-K167 — sentence-case chrome. Remaining call sites stay valid but no longer
 * force shouting ALL-CAPS (Greek diacritic strip is unused when CSS is sentence-case).
 * Keep `mapAllCapsLabelChildren` for any surface that still opts into uppercase CSS.
 */
export function AllCapsLabel({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
