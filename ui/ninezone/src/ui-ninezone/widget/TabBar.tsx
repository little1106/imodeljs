/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Widget
 */

import "./TabBar.scss";
import * as React from "react";
import { Point, Timer } from "@bentley/ui-core";
import { assert } from "../base/assert";
import { isTabTarget, useDragWidget, UseDragWidgetArgs } from "../base/DragManager";
import { getUniqueId, NineZoneDispatchContext } from "../base/NineZone";
import { WidgetTargetState } from "../base/NineZoneState";
import { usePointerCaptor } from "../base/PointerCaptor";
import { TabBarButtons } from "./Buttons";
import { FloatingWidgetIdContext } from "./FloatingWidget";
import { WidgetTabs } from "./Tabs";
import { WidgetIdContext } from "./Widget";

/** @internal */
export const WidgetTabBar = React.memo(function WidgetTabBar() { // tslint:disable-line: variable-name no-shadowed-variable
  const dispatch = React.useContext(NineZoneDispatchContext);
  const id = React.useContext(WidgetIdContext);
  assert(id);
  const floatingWidgetId = React.useContext(FloatingWidgetIdContext);
  const widgetId = floatingWidgetId === undefined ? id : floatingWidgetId;
  const handleWidgetDragStart = useDragWidget({
    widgetId,
  });
  const handleDragStart = React.useCallback((initialPointerPosition) => {
    handleWidgetDragStart({
      initialPointerPosition,
    });
  }, [handleWidgetDragStart]);
  const onDrag = React.useCallback<NonNullable<UseDragWidgetArgs["onDrag"]>>((dragBy) => {
    floatingWidgetId !== undefined && dispatch({
      type: "WIDGET_DRAG",
      dragBy,
      floatingWidgetId,
    });
  }, [dispatch, floatingWidgetId]);
  const onDragEnd = React.useCallback<NonNullable<UseDragWidgetArgs["onDragEnd"]>>((dragTarget) => {
    let target: WidgetTargetState = {
      type: "floatingWidget",
    };
    if (dragTarget && isTabTarget(dragTarget)) {
      target = dragTarget;
    } else if (dragTarget) {
      target = {
        ...dragTarget,
        newWidgetId: getUniqueId(),
      };
    }
    floatingWidgetId !== undefined && dispatch({
      type: "WIDGET_DRAG_END",
      floatingWidgetId,
      target,
    });
  }, [dispatch, floatingWidgetId]);
  useDragWidget({
    widgetId: id,
    onDrag,
    onDragEnd,
  });
  const ref = useDrag(handleDragStart);
  return (
    <div
      className="nz-widget-tabBar"
    >
      <div
        className="nz-handle"
        ref={ref}
      />
      <WidgetTabs />
      <TabBarButtons />
    </div>
  );
});

/** Hook to control drag interactions.
 * Starts drag interaction after pointer moves or after timeout.
 * @internal
 */
export function useDrag<T extends HTMLElement>(onDragStart: (initialPointerPosition: Point) => void) {
  const dragStartTimer = React.useRef<Timer>(new Timer(300));
  const initialPointerPosition = React.useRef<Point>();
  const handlePointerDown = React.useCallback((e: PointerEvent) => {
    initialPointerPosition.current = new Point(e.clientX, e.clientY);
    dragStartTimer.current.start();
  }, []);
  const handlePointerMove = React.useCallback(() => {
    initialPointerPosition.current && onDragStart(initialPointerPosition.current);
    dragStartTimer.current.stop();
    initialPointerPosition.current = undefined;
  }, [onDragStart]);
  const handlePointerUp = React.useCallback(() => {
    dragStartTimer.current.stop();
    initialPointerPosition.current = undefined;
  }, []);
  React.useEffect(() => {
    const listener = () => {
      assert(initialPointerPosition.current);
      onDragStart(initialPointerPosition.current);
      initialPointerPosition.current = undefined;
    };
    const timer = dragStartTimer.current;
    timer.setOnExecute(listener);
    return () => {
      timer.setOnExecute(undefined);
    };
  }, [onDragStart]);
  const ref = usePointerCaptor<T>(handlePointerDown, handlePointerMove, handlePointerUp);
  return ref;
}
