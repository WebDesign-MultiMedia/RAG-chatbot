import "./global.css"
import type { ReactNode } from "react"
import Image from "next/image"
import { Bebas_Neue, Inter } from "next/font/google"
import nycSkyline from "./assets/nyc.jpeg"

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" })
const body = Inter({ subsets: ["latin"], variable: "--font-body" })

export const metadata = {
    title: "NYC GPT",
    description: "The AI assistant that knows the five boroughs inside and out."
}

export const viewport = {
    themeColor: "#0a0a0f",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
}

const RootLayout = ({ children }: { children: ReactNode }) => {
    return (
        <html lang="en" className={`${display.variable} ${body.variable}`}>
            <body>
                <Image src={nycSkyline} alt="" fill priority sizes="100vw" className="bg-photo" />
                <div className="bg-overlay" />
                {children}
            </body>
        </html>
    )
}

export default RootLayout;
