import { baseApi } from '../baseApi';

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params?: any) => ({ url: '/products', params }),
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation({
      query: (body: FormData) => ({ url: '/products', method: 'POST', body, formData: true }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, formData }: { id: string; formData: FormData }) => ({
        url: `/products/${id}`, method: 'PUT', body: formData, formData: true,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation({
      query: (id: string) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
