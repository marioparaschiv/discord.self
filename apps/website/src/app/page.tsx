import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { InstallButton } from '@/components/InstallButton';
import { buttonStyles } from '@/styles/ui/button';
import { DESCRIPTION } from '@/util/constants';

export default async function Page() {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-screen-lg flex-col place-content-center place-items-center gap-24 px-8 pt-12 pb-16">
			<div className="flex w-full flex-col gap-10 rounded-3xl bg-[#5865f2]/15 px-6 py-10 text-center sm:px-10">
				<h1 className="text-base-heading-xl font-black sm:text-7xl sm:leading-tight">
					A{' '}
					<span className="bg-base-blurple-400 text-base-neutral-0 relative rounded-sm px-3 py-2">
						user-account-first
					</span>{' '}
					Discord.js fork.
				</h1>
				<p className="text-base-neutral-600 dark:text-base-neutral-300 md:my-6">{DESCRIPTION}</p>

				<div className="flex flex-wrap place-content-center gap-4 sm:flex-wrap md:flex-row">
					<Link className={buttonStyles({ variant: 'filled' })} href="/docs">
						Docs
					</Link>
					<a
						className={buttonStyles({ variant: 'discreet' })}
						href="https://discordjs.guide"
						rel="noopener noreferrer"
						target="_blank"
					>
						Guide <ExternalLink aria-hidden data-slot="icon" size={18} />
					</a>
					<a
						className={buttonStyles({ variant: 'discreet' })}
						href="https://github.com/marioparaschiv/discord.self"
						rel="external noopener noreferrer"
						target="_blank"
					>
						GitHub <ExternalLink aria-hidden data-slot="icon" size={18} />
					</a>
				</div>

				<InstallButton className="place-self-center" />
			</div>
		</div>
	);
}
