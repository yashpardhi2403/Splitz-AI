"use client";

import React from "react";
import { SignedOut, SignedIn, SignInButton, UserButton, SignUpButton } from "@clerk/nextjs";
import { useStoreUser } from "@/hooks/use-store-user";
import { BarLoader } from "react-spinners";

const Header = () => {

    const { isLoading } = useStoreUser();

    return (
        <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50
        supports-[backdrop-filter]:bg-white/60">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
                <SignedOut>
                    <SignInButton />
                    <SignUpButton />
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </nav>
            
            {isLoading && <BarLoader width={"100%"} color="#36d7b7" />}
        </header>
    )
};

export default Header;