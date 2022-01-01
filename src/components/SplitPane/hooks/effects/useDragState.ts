import * as ReactDOM from 'react-dom';
import { useEventListener } from '../../../../hooks/useEventListener';
import { useCallback, useMemo, useState } from 'react';

export interface ClientPosition {
  clientX: number;
  clientY: number;
}

export interface DragState {
  offset: number;
  index: number;
}
export type BeginDragCallback = (props: { position: ClientPosition; index: number }) => void;
interface DragStateHandlers {
  beginDrag: BeginDragCallback;
  dragState: DragState | null;
  onMouseMove?: (event: ClientPosition) => void;
  onTouchMove?: (event: TouchEvent) => void;
  onMouseUp: () => void;
  onMouseEnter?: (event: MouseEvent) => void;
}

const useDragStateHandlers = (
  isVertical: boolean,
  onDragFinished: (dragState: DragState) => void
): DragStateHandlers => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<number | null>(null);
  const [currentPos, setCurrentPos] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const beginDrag: BeginDragCallback = useCallback(
    ({ position, index }: { position: ClientPosition; index: number }): void => {
      //console.log('beginDrag', {position, index});
      const pos = isVertical ? position.clientX : position.clientY;
      ReactDOM.unstable_batchedUpdates(() => {
        setDraggingIndex(index);
        setIsDragging(true);
        setDragStartPos(pos);
        setCurrentPos(pos);
      });
    },
    [isVertical]
  );

  const dragState: DragState | null = useMemo(() => {
    if (isDragging && currentPos !== null && dragStartPos !== null && draggingIndex !== null) {
      const offset = currentPos - dragStartPos;
      return { offset, index: draggingIndex };
    } else return null;
  }, [currentPos, dragStartPos, draggingIndex, isDragging]);

  const onMouseUp = useCallback((): void => {
    //console.log('onMouseUp', {isDragging, dragState});
    if (isDragging && dragState) {
      //console.log('onMouseUp - batch-start');
      ReactDOM.unstable_batchedUpdates(() => {
        //console.log('onMouseUp - batch-begin');
        setIsDragging(false);
        onDragFinished(dragState);
        //console.log('onMouseUp - batch-end');
      });
    }
  }, [isDragging, dragState, onDragFinished]);

  const onMouseMove = useCallback(
    (event: ClientPosition): void => {
      //console.log('onMouseMove', {isDragging, event});
      if (isDragging) {
        const pos = isVertical ? event.clientX : event.clientY;
        setCurrentPos(pos);
      } else setCurrentPos(null);
    },
    [isDragging, isVertical]
  );

  const onTouchMove = useCallback(
    (event: TouchEvent): void => {
      //console.log('onTouchMove', {isDragging, event});
      if (isDragging) {
        onMouseMove(event.touches[0]);
      }
    },
    [isDragging, onMouseMove]
  );
  const onMouseEnter = useCallback(
    (event: MouseEvent): void => {
      //console.log('onMouseEnter', {isDragging, event});
      if (isDragging) {
        const isPrimaryPressed = (event.buttons & 1) === 1;
        if (!isPrimaryPressed) {
          onMouseUp();
        }
      }
    },
    [isDragging, onMouseUp]
  );

  return { beginDrag, dragState, onMouseMove, onTouchMove, onMouseUp, onMouseEnter };
};

interface UseDragStateReturn {
  dragState: DragState | null;
  beginDrag: BeginDragCallback;
  onMouseUp: () => void;
}
export const useDragState = (
  isVertical: boolean,
  onDragFinished: (dragState: DragState) => void
): UseDragStateReturn => {
  const {
    beginDrag,
    dragState,
    onMouseMove,
    onTouchMove,
    onMouseUp,
    onMouseEnter,
  } = useDragStateHandlers(isVertical, onDragFinished);

  useEventListener('mousemove', onMouseMove);
  useEventListener('touchmove', onTouchMove);
  useEventListener('mouseup', onMouseUp);
  useEventListener('mouseenter', onMouseEnter);

  return { dragState, beginDrag, onMouseUp };
};
