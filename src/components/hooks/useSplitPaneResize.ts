import * as React from 'react';
import { getDefaultSize, getMinSize, getNodeKey, move } from '../SplitPane/helpers';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Direction, SplitPaneProps } from '../SplitPane';
import { ClientPosition, DragState, useDragState } from './useDragStateHandlers';

interface ResizeState {
  index: number;
}

export interface ChildPane {
  key: string;
  node: React.ReactNode;
  ref: React.RefObject<HTMLDivElement>;
  size: number;
  minSize: number;
}
interface SplitPaneResizeReturns {
  childPanes: ChildPane[];
  resizeState: ResizeState | null;
  handleDragStart: (index: number, pos: ClientPosition) => void;
}

interface SplitPaneResizeOptions
  extends Pick<
    SplitPaneProps,
    'children' | 'split' | 'defaultSizes' | 'minSizes' | 'hooks' | 'collapseOptions' | 'direction'
  > {
  collapsedIndices: number[];
  direction: Direction;
}
export function useSplitPaneResize(options: SplitPaneResizeOptions): SplitPaneResizeReturns {
  const {
    children,
    split,
    defaultSizes,
    minSizes,
    hooks,
    collapsedIndices,
    collapseOptions,
    direction,
  } = options;

  // a map keeping track of all of the pane sizes e.g. {"index.0" => 324.671875, "index.1" => 262.671875, "index.2" => 167.671875}
  const [sizes, setSizes] = useState(new Map<string, number>());
  const paneRefs = useRef(new Map<string, React.RefObject<HTMLDivElement>>());
  const getMovedSizes = useCallback(
    (dragState: DragState<ResizeState> | null): number[] => {
      const collectedSizes = children.map(
        (node, index) => sizes.get(getNodeKey(node, index)) || getDefaultSize(index, defaultSizes)
      );

      if (dragState) {
        const {
          offset,
          extraState: { index },
        } = dragState;
        move(collectedSizes, index, offset, minSizes, direction);
      }

      return collectedSizes;
    },
    [children, defaultSizes, direction, minSizes, sizes]
  );

  const handleDragFinished = useCallback(
    (dragState: DragState<ResizeState>) => {
      const movedSizes = getMovedSizes(dragState);

      setSizes(
        new Map(
          children.map((node, index): [string, number] => [
            getNodeKey(node, index),
            movedSizes[index],
          ])
        )
      );

      if (hooks?.onDragFinished) {
        hooks?.onDragFinished(movedSizes);
      }
    },
    [children, getMovedSizes, hooks]
  );

  const [dragState, beginDrag] = useDragState<ResizeState>(split, handleDragFinished);
  const movedSizes = useMemo(() => getMovedSizes(dragState), [dragState, getMovedSizes]);

  const resizeState = dragState ? dragState.extraState : null;

  useEffect(() => {
    if (hooks?.onChange && dragState) {
      hooks?.onChange(movedSizes);
    }
  }, [dragState, movedSizes, hooks]);

  // converts all children nodes into 'childPane' objects that has its ref, key, but not the size yet
  const childPanes = useMemo(() => {
    const prevPaneRefs = paneRefs.current;
    paneRefs.current = new Map<string, React.RefObject<HTMLDivElement>>();
    return children.map(
      (node, index): Omit<ChildPane, 'size'> => {
        const key = getNodeKey(node, index);

        const ref = prevPaneRefs.get(key) || React.createRef();
        paneRefs.current.set(key, ref);

        const minSize = getMinSize(index, minSizes);

        return { key, node, ref, minSize };
      }
    );
  }, [children, minSizes]);

  //populates the sizes of all the initially populated childPanes, adjust sizes based on collapsed state
  const childPanesWithSizes = useMemo(
    () =>
      childPanes.map((child, index) => {
        const isPrevCollapsed = collapsedIndices.includes(index - 1);
        const prevSizes = movedSizes.slice(0, index);
        const prevCollapsedSize = prevSizes.reduce((prev, size, idx) => {
          const adjustedSize = size - (collapseOptions?.collapseSize ?? 0);
          return collapsedIndices.includes(idx) ? adjustedSize + prev : prev;
        }, 0);

        const size = (isPrevCollapsed ? prevCollapsedSize : 0) + movedSizes[index];
        return { ...child, size };
      }),
    [childPanes, collapseOptions, collapsedIndices, movedSizes]
  );

  const handleDragStart = useCallback(
    (index: number, pos: ClientPosition): void => {
      const sizeAttr = split === 'vertical' ? 'width' : 'height';

      const clientSizes = new Map(
        childPanes.map(({ key, ref }): [string, number] => {
          const size = ref.current ? ref.current.getBoundingClientRect()[sizeAttr] : 0;
          return [key, size];
        })
      );

      if (hooks?.onDragStarted) {
        hooks?.onDragStarted();
      }

      beginDrag(pos, { index });
      setSizes(clientSizes);
    },
    [beginDrag, childPanes, hooks, split]
  );

  return { childPanes: childPanesWithSizes, resizeState, handleDragStart };
}