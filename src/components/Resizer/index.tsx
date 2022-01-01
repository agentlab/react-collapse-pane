import React, { useCallback, useMemo, useState } from 'react';
import { Fade } from '@material-ui/core';
import { BeginDragCallback } from '../SplitPane/hooks/effects/useDragState';
import {
  ButtonContainer,
  ButtonWrapper,
  getSizeWithUnit,
  ResizeGrabber,
  ResizePresentation,
} from './helpers';
import { useMergeClasses } from '../../hooks/useMergeClasses';
import { CollapseOptions, ResizerOptions } from '../SplitPane';
import { useTransition } from './hooks/useTransition';
import { SplitType } from '../SplitPane';
import { debounce } from '../SplitPane/helpers';

const defaultResizerOptions: Required<ResizerOptions> = {
  grabberSize: '1rem',
  css: { backgroundColor: 'rgba(120, 120, 120, 0.3)' },
  hoverCss: { backgroundColor: 'rgba(120, 120, 120, 0.6)' },
};

export interface ResizerProps {
  isVertical: boolean;
  isLtr: boolean;
  split: SplitType;
  className?: string;
  paneIndex: number;
  collapseOptions?: CollapseOptions;
  resizerOptions?: Partial<ResizerOptions>;
  onDragStarted: BeginDragCallback;
  onMouseUp: () => void;
  onCollapseToggle: (paneIndex: number) => void;
  isCollapsed: boolean;
}
export const Resizer = ({
  isVertical,
  split,
  className,
  paneIndex,
  onDragStarted,
  onMouseUp,
  resizerOptions,
  collapseOptions,
  onCollapseToggle,
  isLtr,
  isCollapsed,
}: ResizerProps) => {
  const { grabberSize, css, hoverCss } = { ...defaultResizerOptions, ...resizerOptions };

  const classes = useMergeClasses(['Resizer', split, className]);
  const grabberSizeWithUnit = useMemo(() => getSizeWithUnit(grabberSize), [grabberSize]);
  const Transition = useTransition(collapseOptions);

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      //console.log('handleMouseDown');
      event.preventDefault();
      if (!isCollapsed) {
        onDragStarted({ index: paneIndex, position: event });
      }
    },
    [paneIndex, isCollapsed, onDragStarted]
  );
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      //console.log('handleTouchStart', event);
      //event.preventDefault();
      if (!isCollapsed) {
        onDragStarted({ index: paneIndex, position: event.touches[0] });
      }
    },
    [paneIndex, isCollapsed, onDragStarted]
  );
  const handleTouchEnd = useCallback(
    (_event: React.TouchEvent) => {
      //console.log('handleTouchEnd', _event);
      //_event.preventDefault();
      //if (!isCollapsed) {
        onMouseUp();
      //}
    },
    [/*isCollapsed,*/ onMouseUp]
  );
  const handleButtonClick = useCallback(
    (event: React.MouseEvent) => {
      //console.log('handleButtonClick');
      event.stopPropagation();
      onCollapseToggle(paneIndex);
    },
    [paneIndex, onCollapseToggle]
  );
  const handleButtonMousedown = useCallback((event: React.MouseEvent) => {
    //console.log('handleButtonMousedown');
    event.stopPropagation();
  }, []);

  const debouncedSetHovered = useCallback(
    debounce(() => setIsHovered(true), 50),
    [setIsHovered]
  );
  const handleMouseEnterGrabber = useCallback(() => {
    debouncedSetHovered();
  }, [debouncedSetHovered]);

  const debouncedSetNotHovered = useCallback(
    debounce(() => setIsHovered(false), 100),
    [setIsHovered]
  );
  const handleMouseLeaveGrabber = useCallback(() => debouncedSetNotHovered(), [
    debouncedSetNotHovered,
  ]);

  const getWidthOrHeight = useCallback(
    (size: string | number) => (isVertical ? { width: size } : { height: size }),
    [isVertical]
  );
  const preButtonFlex = useMemo(
    () => Math.max(100 - (collapseOptions?.buttonPositionOffset ?? 0), 0),
    [collapseOptions]
  );
  const postButtonFlex = useMemo(
    () => Math.max(100 + (collapseOptions?.buttonPositionOffset ?? 0), 0),
    [collapseOptions]
  );
  const isTransition = collapseOptions?.buttonTransition !== 'none';
  const collapseButton = collapseOptions ? (
    <ButtonContainer $isVertical={isVertical} $grabberSize={grabberSizeWithUnit} $isLtr={isLtr}>
      <div style={{ flex: `1 1 ${preButtonFlex}px` }} />
      <Transition
        in={isTransition ? isHovered : true}
        timeout={isTransition ? collapseOptions.buttonTransitionTimeout : 0}
        style={{ flex: '0 0 0', position: 'relative' }}
      >
        <ButtonWrapper
          $isVertical={isVertical}
          onClick={handleButtonClick}
          onMouseDown={handleButtonMousedown}
        >
          {isCollapsed ? collapseOptions.afterToggleButton : collapseOptions.beforeToggleButton}
        </ButtonWrapper>
      </Transition>
      <div style={{ flex: `1 1 ${postButtonFlex}px` }} />
    </ButtonContainer>
  ) : null;
//, touchAction: 'none'
  return (
    <div key="grabber.root" style={{ position: 'relative' }}>
      <ResizeGrabber
        key="grabber"
        $isVertical={isVertical}
        $isCollapsed={isCollapsed}
        $isLtr={isLtr}
        style={getWidthOrHeight(grabberSize)}
        role="presentation"
        className={classes}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnterGrabber}
        onMouseLeave={handleMouseLeaveGrabber}
      >
        {collapseButton}
      </ResizeGrabber>
      <Fade key="resize.presentation.fadein" in={!isHovered}>
        <ResizePresentation $isVertical={isVertical} style={{ ...getWidthOrHeight(1), ...css }} />
      </Fade>
      <Fade key="resize.presentation.fadeout" in={isHovered}>
        <ResizePresentation
          $isVertical={isVertical}
          style={{ ...getWidthOrHeight(1), ...hoverCss }}
        />
      </Fade>
    </div>
  );
};
Resizer.displayName = 'Resizer';
