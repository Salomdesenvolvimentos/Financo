-- Verificar se o usuário foi criado corretamente
SELECT * FROM auth.users WHERE email = 'salomdesenvolvimentos@hotmail.com';

-- Verificar se o perfil foi criado na tabela public.users
SELECT * FROM public.users WHERE email = 'salomdesenvolvimentos@hotmail.com';

-- Verificar se as categorias foram criadas
SELECT COUNT(*) as total_categorias
FROM public.categories c
JOIN public.users u ON u.id = c.user_id
WHERE u.email = 'salomdesenvolvimentos@hotmail.com';

-- Ver as categorias
SELECT c.nome, c.tipo 
FROM public.categories c
JOIN public.users u ON u.id = c.user_id
WHERE u.email = 'salomdesenvolvimentos@hotmail.com'
ORDER BY c.tipo, c.nome;
