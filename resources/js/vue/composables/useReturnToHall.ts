import { useRouter } from 'vue-router';
import { returnToHall, type ReturnToHallOptions } from '../services/hallNavigation';

export function useReturnToHall() {
  const router = useRouter();

  return {
    returnToHall: (options?: ReturnToHallOptions) => returnToHall(router, options),
  };
}
