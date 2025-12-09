import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Edit, UserX, UserCheck, Loader2, Ban } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import useAuthStore from '@/stores/useAuthStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

// Interfaces
interface AdminUser {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'operator'
  client_name: string | null
  client_id: string | null
  created_at: string
  is_active: boolean
}

interface Client {
  id: string
  name: string
}

// Schemas
const userEditSchema = z
  .object({
    id: z.string(),
    full_name: z.string().min(1, 'Nome completo é obrigatório'),
    email: z.string().email(),
    role: z.enum(['admin', 'operator']),
    client_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'operator' && !data.client_id) {
        return false
      }
      return true
    },
    {
      message: 'Cliente é obrigatório para operadores',
      path: ['client_id'],
    },
  )

type UserEditForm = z.infer<typeof userEditSchema>

export default function Users() {
  const { token, user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Modals state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deactivatingUser, setDeactivatingUser] = useState<AdminUser | null>(
    null,
  )

  // Form setup
  const form = useForm<UserEditForm>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      id: '',
      full_name: '',
      email: '',
      role: 'operator',
      client_id: '',
    },
  })

  const fetchUsers = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await api.db.select<AdminUser>(
        'admin_users_view',
        'order=created_at.desc',
        token,
      )
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users', error)
      toast.error('Erro ao carregar lista de usuários')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    if (!token) return
    try {
      const data = await api.db.select<Client>(
        'clients',
        'select=id,name',
        token,
      )
      setClients(data)
    } catch (error) {
      console.error('Failed to fetch clients', error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchClients()
  }, [token])

  useEffect(() => {
    if (editingUser) {
      form.reset({
        id: editingUser.id,
        full_name: editingUser.full_name || '',
        email: editingUser.email || '',
        role: editingUser.role,
        client_id: editingUser.client_id || undefined,
      })
    }
  }, [editingUser, form])

  const handleEditSubmit = async (data: UserEditForm) => {
    if (!token) return
    setIsProcessing(true)
    try {
      // 1. Update Profile
      await api.db.update(
        'profiles',
        data.id,
        {
          full_name: data.full_name,
          role: data.role,
        },
        token,
      )

      // 2. Handle Client Association
      // Always remove existing association first to be safe (or we could check)
      // Since we don't know the ID of the client_user record easily without fetching,
      // and we want to enforce 1 client per user logic:
      await api.db.delete('client_users', `user_id=eq.${data.id}`, token)

      if (data.role === 'operator' && data.client_id) {
        // Add new association
        await api.db.insert(
          'client_users',
          {
            user_id: data.id,
            client_id: data.client_id,
          },
          token,
        )
      }

      toast.success('Usuário atualizado com sucesso')
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Failed to update user', error)
      toast.error('Erro ao atualizar usuário')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeactivate = async () => {
    if (!token || !deactivatingUser) return
    setIsProcessing(true)
    try {
      await api.db.update(
        'profiles',
        deactivatingUser.id,
        { is_active: false },
        token,
      )
      toast.success('Usuário desativado com sucesso')
      setDeactivatingUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Failed to deactivate user', error)
      toast.error('Erro ao desativar usuário')
    } finally {
      setIsProcessing(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Admin</Badge>
      case 'operator':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">Operador</Badge>
        )
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Gerenciamento de Usuários
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Usuários</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cliente vinculado</TableHead>
                <TableHead>Data de criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center h-24 text-muted-foreground"
                  >
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn({
                      'opacity-50 bg-muted/30': !user.is_active,
                    })}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.full_name || '-'}
                        {!user.is_active && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] h-5 px-1.5"
                          >
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.role === 'admin' ? '-' : user.client_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => setEditingUser(user)}
                          disabled={!user.is_active}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Desativar"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeactivatingUser(user)}
                          disabled={
                            !user.is_active || user.id === currentUser?.id
                          }
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário abaixo.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cargo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="operator">Operador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('role') === 'operator' && (
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Modal */}
      <AlertDialog
        open={!!deactivatingUser}
        onOpenChange={(open) => !open && setDeactivatingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar{' '}
              <span className="font-bold text-foreground">
                {deactivatingUser?.full_name}
              </span>
              ? O usuário perderá o acesso ao sistema imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
