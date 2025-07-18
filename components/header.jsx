import React from "react";
import { SignedOut, SignedIn, SignInButton, UserButton, SignUpButton } from "@clerk/nextjs";


const Header = () => {
    return (
        <div>
            <SignedOut>
                <SignInButton />
                <SignUpButton />
            </SignedOut>
            <SignedIn>
                <UserButton />
            </SignedIn>
        </div>
    )
};

export default Header;