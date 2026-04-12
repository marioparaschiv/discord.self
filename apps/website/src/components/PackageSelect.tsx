'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Select, SelectList, SelectOption, SelectTrigger } from '@/components/ui/Select';

export function PackageSelect() {
	const router = useRouter();
	const params = useParams<{
		packageName: string;
	}>();

	const { data } = useQuery<{ name: string }[]>({
		queryKey: ['packages'],
		queryFn: async () => {
			const response = await fetch('/api/docs/packages');

			return response.json();
		},
	});

	const packages =
		data && data.length > 0
			? data
			: [
					{
						name: params.packageName,
					},
				];

	return (
		<Select aria-label="Select a package" defaultSelectedKey={params.packageName} key={params.packageName}>
			<SelectTrigger className="bg-[#f3f3f4] dark:bg-[#121214]" />
			<SelectList classNames={{ popover: 'bg-[#f3f3f4] dark:bg-[#28282d]' }} items={packages}>
				{(item) => (
					<SelectOption
						className="dark:pressed:bg-[#313135] bg-[#f3f3f4] dark:bg-[#28282d] dark:hover:bg-[#313135]"
						href={`/docs/packages/${item.name}/stable`}
						id={item.name}
						key={item.name}
						onHoverStart={() => router.prefetch(`/docs/packages/${item.name}/stable`)}
						textValue={item.name}
					>
						{item.name}
					</SelectOption>
				)}
			</SelectList>
		</Select>
	);
}
