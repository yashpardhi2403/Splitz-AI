"use client";

import React from "react";
import { SignedOut, SignedIn, SignInButton, UserButton, SignUpButton } from "@clerk/nextjs";
import { useStoreUser } from "@/hooks/use-store-user";
import { BarLoader } from "react-spinners";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Authenticated, Unauthenticated } from "convex/react";
import { LayoutDashboard } from "lucide-react";



const Header = () => {

    const { isLoading } = useStoreUser();
    const path = usePathname();
    return (
        <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-[backdrop-filter]:bg-white/60">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between relative">
                {/* Left: Logo */}
                <div className="flex items-center min-w-0">
                    <Link href="/" className="flex items-center gap-2">
                        <Image 
                            src="/logos/logo.png" 
                            alt="Splitz Logo" 
                            width={200} 
                            height={60} 
                            className="h-11 w-auto object-contain"
                        />
                    </Link>
                </div>

                {/* Center: Nav Links */}
                {path === "/" && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
                        <Link
                            href="/features"
                            className="text-sm font-medium hover:text-green-600 transition"
                        >
                            Features
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="text-sm font-medium hover:text-green-600 transition"
                        >
                            How It Works
                        </Link>
                    </div>
                )}

                {/* Right: Auth/User Buttons */}
                <div className="flex items-center gap-4 min-w-0 ml-auto">
                    <Authenticated>
                        <Link href="/dashboard">
                            <Button
                                variant="outline"
                                className="hidden md:inline-flex items-center gap-2 hover:text-green-600 hover:border-green-600 transition"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Dashboard
                            </Button>
                            <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                                <LayoutDashboard className="h-4 w-4" />
                            </Button>
                        </Link>

                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-10 h-10",
                                    userButtonPopoverCard: "shadow-xl",
                                    userPreviewMainIdentifier: "font-semibold",
                                },
                            }}
                            afterSignOutUrl="/"
                        />
                    </Authenticated>

                    <Unauthenticated>
                        <SignInButton>
                            <Button variant="ghost">Sign In</Button>
                        </SignInButton>

                        <SignUpButton>
                            <Button className="bg-green-600 hover:bg-green-700 border-none">
                                Get Started
                            </Button>
                        </SignUpButton>
                    </Unauthenticated>
                </div>
            </nav>
            
            {isLoading && <BarLoader width={"100%"} color="#36d7b7" />}
        </header>
    )
};

export default Header;