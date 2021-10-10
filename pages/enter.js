import { useCallback, useContext, useState, useEffect } from "react";
import debounce from "lodash.debounce";
import toast from "react-hot-toast";

import { UserContext } from "@lib/context";
import { auth, firestore, googleAuthProvider } from "@lib/firebase";

export default function EnterPage({  }) {
    const { user, username } = useContext(UserContext);

    return (
        <main>
            {user
                ?
                !username ? <UsernameForm /> : <SignOutButton />
                : <SignInButton />
            }
        </main>
    )
}

// Sign in with Google button
function SignInButton() {
    const signInWithGoogle = async () => {
        try {
            await auth.signInWithPopup(googleAuthProvider);
        } catch(e) {
            toast.error(e.message);
        }
    };

    return (
        <button className="btn-google" onClick={signInWithGoogle}>
            <img src={'/google.png'} alt="google logo" /> Sign in with Google
        </button>
    );
}

// Sign out button
function SignOutButton() {
    const signOut = () => {
        try {
            auth.signOut();
        } catch(e) {
            toast.error(e.message);
        }
    }

    return <button onClick={signOut}>Sign Out</button>
}

function UsernameForm() {
    const [formValue, setFormValue] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [loading, setLoading] = useState(false);

    const { user, username } = useContext(UserContext);

    useEffect(() => {
        checkUsername(formValue);
    }, [formValue]);

    const onChange = (e) => {
        const val = e.target.value.toLowerCase();
        const regEx = /^(?=[a-zA-Z0-9._]{3,15}$)(?!.*[_.]{2})[^_.].*[^_.]$/;

        if (val.length < 3) {
            setFormValue(val);
            setLoading(false);
            setIsValid(false);
        }

        if(regEx.test(val)) {
            setFormValue(val);
            setLoading(true);
            setIsValid(false);
        }
    }

    const checkUsername = useCallback(debounce(async (username) => {
        if (username.length >= 3) {
            const ref = firestore.doc(`usernames/${username}`);
            const { exists } = await ref.get();
            console.log('Firestore read executed!');
            setIsValid(!exists);
            setLoading(false);
        }
    }, 500), []);

    const onSubmit = async (e) => {
        e.preventDefault();

        try {
            const userDoc = firestore.doc(`users/${user.uid}`);
            const usernameDoc = firestore.doc(`usernames/${formValue}`);
    
            const batch = firestore.batch();
            batch.set(userDoc, {
                username: formValue,
                photoURL: user.photoURL,
                displayName: user.displayName
            });
            batch.set(usernameDoc, { uid: user.uid, });
    
            await batch.commit();
        } catch(e) {
            toast.error(e.message);
        }

    }


    return (
        !username && (
            <section>
                <h3>Choose Username</h3>
                <form onSubmit={onSubmit}>

                    <input
                        type="text"
                        name="username"
                        placeholder="username"
                        value={formValue}
                        onChange={onChange}
                    />

                    <UsernameMessage username={formValue} isValid={isValid} loading={loading} />

                    <button type="submit" className="btn-green" disabled={!isValid}>
                        Choose
                    </button>

                    <h3>Debug State</h3>
                    <div>
                        Username: {username}
                        <br />
                        Loading: {loading.toString()}
                        <br />
                        Username Valid: {isValid.toString()}
                    </div>
                </form>
            </section>
        )
    );
};

function UsernameMessage({ username, isValid, loading }) {
    if (loading) {
        return <p>Checking...</p>
    } else if (isValid) {
        return <p className="text-success">{username} is available!</p>;
    } else if (username && !isValid) {
        return <p className="text-danger">That username is taken!</p>;
    } else {
        return <p></p>;
    }
}