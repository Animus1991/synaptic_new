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
 * Wrap text that is styled with `uppercase` / `text-transform: uppercase`.
 * CSS alone keeps Greek tonos; this strips them for correct all-caps Greek.
 */
export function AllCapsLabel({ children }: { children: ReactNode }) {
  return <>{mapAllCapsLabelChildren(children)}</>;
}
