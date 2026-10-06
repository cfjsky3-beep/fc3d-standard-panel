import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "福彩3D标准盘", description: "福彩3D标准盘客户端、玩法、赔率、后台配置与初始化数据原型" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
