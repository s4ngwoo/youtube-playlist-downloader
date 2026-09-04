import { useRef, useCallback, useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { WindowResizeOptions } from "../types/download";

/**
 * 콘텐츠 영역의 실제 렌더링 높이를 감지하여 Tauri 윈도우 크기를 동적으로 최적화하는 훅
 */
export function useDynamicWindowResize(
  contentRef: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList = [],
  options: WindowResizeOptions = {}
) {
  const {
    minHeight = 740,
    maxHeight = 1040,
    padding = 48,
    threshold = 15,
    debounceMs = 120,
  } = options;

  const isResizingRef = useRef(false);
  const lastTargetHeightRef = useRef<number | null>(null);

  const adjustWindowSize = useCallback(async () => {
    if (!contentRef.current || isResizingRef.current) return;

    try {
      const appWindow = getCurrentWindow();
      if (!appWindow) return;

      const element = contentRef.current;
      // 콘텐츠가 요구하는 순수 높이 계산 (scrollHeight 및 offsetHeight 중 최댓값 + 상하 여백)
      const measuredHeight = Math.ceil(
        Math.max(element.scrollHeight, element.offsetHeight) + padding
      );

      // 최소/최대 안전 범위로 제한하여 무한 확장 또는 화면 이탈 방지
      const targetHeight = Math.min(Math.max(measuredHeight, minHeight), maxHeight);

      // 이전에 설정한 높이와 차이가 threshold 미만이면 변경하지 않음 (루프 및 진동 방지)
      if (
        lastTargetHeightRef.current !== null &&
        Math.abs(targetHeight - lastTargetHeightRef.current) < threshold
      ) {
        return;
      }

      // 현재 창의 Logical 크기 조회
      const scaleFactor = await appWindow.scaleFactor();
      const physicalSize = await appWindow.innerSize();
      const currentLogical = physicalSize.toLogical(scaleFactor);

      // 현재 윈도우 높이와 차이가 threshold 이상일 때만 실제 setSize 호출
      if (Math.abs(currentLogical.height - targetHeight) >= threshold) {
        isResizingRef.current = true;
        lastTargetHeightRef.current = targetHeight;

        await appWindow.setSize(
          new LogicalSize(Math.max(currentLogical.width, 720), targetHeight)
        );

        // 연속적인 리사이즈 이벤트 차단을 위한 쿨다운 (150ms)
        setTimeout(() => {
          isResizingRef.current = false;
        }, 150);
      }
    } catch (err) {
      console.debug("[DynamicResize] 창 크기 조절 건너뜀:", err);
      isResizingRef.current = false;
    }
  }, [contentRef, minHeight, maxHeight, padding, threshold]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedAdjust = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        adjustWindowSize();
      }, debounceMs);
    };

    debouncedAdjust();

    const element = contentRef.current;
    if (!element) return;

    // DOM 크기 변화를 실시간으로 관찰하는 ResizeObserver 등록
    const observer = new ResizeObserver(() => {
      if (!isResizingRef.current) {
        debouncedAdjust();
      }
    });

    observer.observe(element);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [adjustWindowSize, debounceMs, ...deps]);
}
