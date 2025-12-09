import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Edit, UserX, UserCheck } from 'lucide-react'
import useAuthStore from '@/stores/useAuthStore'
import { api } from '@/lib/api'
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
import { toast } from 'sonner'

interface AdminUser {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'operator'
  client_name: string | null
  created_at: string
}

export default function Users() {
  const { token } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
    fetchUsers()
  }, [token])

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

  const getClientDisplay = (user: AdminUser) => {
    if (user.role === 'admin') return '-'
    return user.client_name || 'N/A'
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
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || '-'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getClientDisplay(user)}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title="Editar">
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Desativar"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
    </div>
  )
}
