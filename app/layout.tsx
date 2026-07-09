import "./global.css"
import type { ReactNode } from "react"
import Image from "next/image"
import nycSkyline from "./assets/nyc.jpeg"

export const metadata = {
    title: "NYC GPT",
    description: "The AI assistant that knows the five boroughs inside and out."
}

const RootLayout = ({ children }: { children: ReactNode }) => {
    return (
        <html lang="en">
            <body>
                <Image src={nycSkyline} alt="" fill priority className="bg-photo" />
                <div className="bg-overlay" />
                {children}
            </body>
        </html>
    )
}

export default RootLayout;