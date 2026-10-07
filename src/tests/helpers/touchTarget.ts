import type { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

type TestInstance = ReturnType<typeof screen.getByLabelText>;

/**
 * Flattened style of the sized container of a Paper icon button. The element found by label is
 * the inner touchable (no width/height); the 48x48 container is its nearest ancestor that sets a width.
 */
export function iconButtonContainerStyle(labelled: TestInstance) {
  let node: TestInstance | null = labelled;
  while (node) {
    const style = StyleSheet.flatten(node.props.style) as { width?: number; height?: number } | undefined;
    if (style?.width !== undefined) return style;
    node = node.parent;
  }
  throw new Error('No ancestor with an explicit width found for the icon button');
}
