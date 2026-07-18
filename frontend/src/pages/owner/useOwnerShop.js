import {useWorkspace} from '../../context/WorkspaceContext';
export default function useOwnerShop(){
  const {activeShop,loading,error,refresh,workspaces,isApproved}=useWorkspace();
  return {shop:activeShop,loading,error,refresh,workspaces,isApproved};
}
