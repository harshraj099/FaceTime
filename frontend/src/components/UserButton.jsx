import { useNavigate } from 'react-router-dom';

import { useUser } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const UserButton = ({ afterSignOutUrl }) => {
  const { user, signOut } = useUser();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex-center size-9 overflow-hidden rounded-full bg-blue-1 font-bold text-white focus:outline-none">
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.username}
            className="size-full object-cover"
          />
        ) : (
          user.username.charAt(0).toUpperCase()
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-dark-3 bg-dark-1 text-white"
      >
        <DropdownMenuLabel className="flex flex-col">
          <span>{user.username}</span>
          <span className="text-xs font-normal text-sky-1">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-dark-3" />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            signOut();
            navigate(afterSignOutUrl);
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserButton;
