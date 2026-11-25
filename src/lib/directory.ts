import { queryOptions } from '@tanstack/react-query';
import { getDirectory } from './directory.functions';
export const directoryOptions = queryOptions({ queryKey: ['directory'], queryFn: () => getDirectory(), staleTime: 30_000, refetchInterval: 60_000 });