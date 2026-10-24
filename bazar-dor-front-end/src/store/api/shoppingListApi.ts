import { baseApi } from '../baseApi';

export const shoppingListApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShoppingLists: builder.query({
      query: (params?: { status?: 'draft' | 'completed'; limit?: number; page?: number }) => ({
        url: '/shopping-lists',
        params,
      }),
      providesTags: ['Plan'],
    }),
    getShoppingList: builder.query({
      query: (id: string) => `/shopping-lists/${id}`,
      providesTags: ['Plan'],
    }),
    createShoppingList: builder.mutation({
      query: (body) => ({ url: '/shopping-lists', method: 'POST', body }),
      invalidatesTags: ['Plan'],
    }),
    updateShoppingList: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/shopping-lists/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Plan'],
    }),
    deleteShoppingList: builder.mutation({
      query: (id: string) => ({ url: `/shopping-lists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Plan'],
    }),
  }),
});

export const {
  useGetShoppingListsQuery,
  useGetShoppingListQuery,
  useCreateShoppingListMutation,
  useUpdateShoppingListMutation,
  useDeleteShoppingListMutation,
} = shoppingListApi;
