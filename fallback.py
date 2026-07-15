"""
EWT360 Helper - Fallback 自动检查脚本
用于图像识别和自动点击检查按钮
支持多尺度模板匹配，优化不同尺寸图片识别
"""

import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple

import pyautogui
from PIL import ImageGrab
import cv2
import numpy as np


class AutoChecker:
    """自动检查按钮识别和点击"""

    def __init__(
        self,
        template_path: str = r"assets\jiancha.png",
        confidence: float = 0.8,
        interval: int = 25,
        scale_range: Tuple[float, float] = (0.7, 1.3),
        scale_steps: int = 8,
    ):
        """
        初始化自动检查器

        Args:
            template_path: 模板图片路径
            confidence: 匹配置信度阈值
            interval: 检查间隔秒数
            scale_range: 缩放范围 (最小比例, 最大比例)
            scale_steps: 缩放步数
        """
        self.template_path = Path(template_path)
        self.confidence = confidence
        self.interval = interval
        self.scale_range = scale_range
        self.scale_steps = scale_steps
        self.target: Optional[np.ndarray] = None
        self._load_template()

    def _load_template(self) -> None:
        """加载模板图片"""
        if not self.template_path.exists():
            print(f"模板图片不存在: {self.template_path}")
            print("请确保图片路径正确")
            sys.exit(1)

        self.target = cv2.imread(str(self.template_path), cv2.IMREAD_GRAYSCALE)
        if self.target is None:
            print(f"无法读取模板图片: {self.template_path}")
            sys.exit(1)

        h, w = self.target.shape[:2]
        print(f"已加载模板: {self.template_path} (尺寸: {w}x{h})")

    def _get_scales(self) -> List[float]:
        """生成缩放比例列表"""
        min_scale, max_scale = self.scale_range
        return np.linspace(min_scale, max_scale, self.scale_steps).tolist()

    def _match_at_scale(
        self, screenshot: np.ndarray, scale: float
    ) -> Tuple[bool, float, Tuple[int, int], Tuple[int, int]]:
        """
        在指定缩放比例下进行模板匹配

        Args:
            screenshot: 屏幕截图灰度图
            scale: 缩放比例

        Returns:
            (是否匹配, 置信度, 左上角坐标, 模板尺寸)
        """
        if self.target is None:
            return False, 0.0, (0, 0), (0, 0)

        h, w = self.target.shape[:2]
        new_w = int(w * scale)
        new_h = int(h * scale)

        # 避免尺寸过小
        if new_w < 10 or new_h < 10:
            return False, 0.0, (0, 0), (0, 0)

        # 缩放模板
        scaled_template = cv2.resize(self.target, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # 模板匹配
        result = cv2.matchTemplate(screenshot, scaled_template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(result)

        return max_val >= self.confidence, max_val, (max_loc[0], max_loc[1]), (new_w, new_h)

    def take_screenshot(self) -> np.ndarray:
        """截取屏幕并返回灰度图"""
        screenshot = ImageGrab.grab()
        return cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2GRAY)

    def find_and_click(self, offset_x: int = 0, offset_y: int = 0) -> bool:
        """
        查找模板并点击（支持多尺度匹配）

        Args:
            offset_x: X轴偏移量
            offset_y: Y轴偏移量

        Returns:
            是否找到并点击
        """
        if self.target is None:
            return False

        try:
            # 截图
            screenshot = self.take_screenshot()
            screenshot_h, screenshot_w = screenshot.shape[:2]

            # 获取缩放比例列表
            scales = self._get_scales()

            best_match = None
            best_val = 0.0

            # 多尺度匹配
            for scale in scales:
                matched, max_val, max_loc, (tpl_w, tpl_h) = self._match_at_scale(
                    screenshot, scale
                )

                if matched and max_val > best_val:
                    best_val = max_val
                    best_match = {
                        "scale": scale,
                        "val": max_val,
                        "loc": max_loc,
                        "size": (tpl_w, tpl_h),
                    }

            # 使用最佳匹配
            if best_match is not None:
                top_left = best_match["loc"]
                tpl_w, tpl_h = best_match["size"]
                scale = best_match["scale"]

                # 计算中心点
                center_x = top_left[0] + tpl_w // 2 + offset_x
                center_y = top_left[1] + tpl_h // 2 + offset_y

                # 边界检查
                center_x = max(0, min(center_x, screenshot_w - 1))
                center_y = max(0, min(center_y, screenshot_h - 1))

                # 点击
                pyautogui.click(center_x, center_y, button="left")
                print(
                    f"找到按钮 - 位置: ({center_x}, {center_y}), "
                    f"置信度: {best_val:.2f}, 缩放: {scale:.2f}x"
                )
                return True
            else:
                print(f"未找到按钮 (最高置信度: {best_val:.2f} < {self.confidence})")
                return False

        except Exception as e:
            print(f"查找失败: {e}")
            return False

    def find_position(self) -> Optional[Tuple[int, int]]:
        """
        仅查找按钮位置，不点击

        Returns:
            按钮中心坐标 (x, y)，未找到返回 None
        """
        if self.target is None:
            return None

        try:
            screenshot = self.take_screenshot()
            screenshot_h, screenshot_w = screenshot.shape[:2]
            scales = self._get_scales()

            best_match = None
            best_val = 0.0

            for scale in scales:
                matched, max_val, max_loc, (tpl_w, tpl_h) = self._match_at_scale(
                    screenshot, scale
                )

                if matched and max_val > best_val:
                    best_val = max_val
                    best_match = {
                        "loc": max_loc,
                        "size": (tpl_w, tpl_h),
                    }

            if best_match is not None:
                top_left = best_match["loc"]
                tpl_w, tpl_h = best_match["size"]
                center_x = top_left[0] + tpl_w // 2
                center_y = top_left[1] + tpl_h // 2
                return (center_x, center_y)

            return None

        except Exception:
            return None

    def run(self) -> None:
        """运行自动检查循环"""
        print(f"启动自动检查 (间隔: {self.interval}秒)")
        print(f"缩放范围: {self.scale_range[0]:.1f}x - {self.scale_range[1]:.1f}x")
        print("按 Ctrl+C 停止")

        count = 0
        try:
            while True:
                count += 1
                print(f"\n--- 第 {count} 次检查 ---")
                self.find_and_click()
                print(f"程序已运行 {count * self.interval} 秒")
                time.sleep(self.interval)
        except KeyboardInterrupt:
            print(f"\n已停止，共运行 {count} 次")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="EWT360 Helper - 自动检查脚本")
    parser.add_argument(
        "-t",
        "--template",
        default=r"assets\jiancha.png",
        help="模板图片路径 (默认: assets\\jiancha.png)",
    )
    parser.add_argument(
        "-c",
        "--confidence",
        type=float,
        default=0.8,
        help="匹配置信度阈值 (默认: 0.8)",
    )
    parser.add_argument(
        "-i",
        "--interval",
        type=int,
        default=2,
        help="检查间隔秒数 (默认: 25)",
    )
    parser.add_argument(
        "--scale-min",
        type=float,
        default=0.7,
        help="最小缩放比例 (默认: 0.7)",
    )
    parser.add_argument(
        "--scale-max",
        type=float,
        default=1.3,
        help="最大缩放比例 (默认: 1.3)",
    )
    parser.add_argument(
        "--scale-steps",
        type=int,
        default=8,
        help="缩放步数 (默认: 8)",
    )

    args = parser.parse_args()

    checker = AutoChecker(
        template_path=args.template,
        confidence=args.confidence,
        interval=args.interval,
        scale_range=(args.scale_min, args.scale_max),
        scale_steps=args.scale_steps,
    )
    checker.run()


if __name__ == "__main__":
    main()
