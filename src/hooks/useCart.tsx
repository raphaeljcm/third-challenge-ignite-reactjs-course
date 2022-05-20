import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    } 

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isProductInCart = cart.find(product => product.id === productId);
      const currentProduct = await api.get(`products/${productId}`).then(response => response.data);
      const { amount } = await api.get(`stock/${productId}`).then(response => response.data);

      const newAmount = isProductInCart ? isProductInCart.amount + 1 : 1;

      if(newAmount > amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(!currentProduct) {
        throw new Error('Este produto não existe');
      }

      if(!isProductInCart) {
         const newProduct = {
          ...currentProduct,
          amount: newAmount
         }

         const newCart = [...cart, newProduct];
         localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
         setCart(newCart);
      } else {
          const newCart = cart.map(item => {
            if(item.id === productId) {
              item.amount = newAmount
            }

            return item;
          });
          
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          
          setCart(newCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInCart = cart.find(product => product.id === productId);

      if(!isProductInCart) {
        throw new Error('Produto não está no carrinho');
      }
      const newCart = cart.filter(item => item.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        throw new Error('Quantidade invalida!');
      }

      const currentStockProduct = await api.get(`stock/${productId}`).then(response => response.data) as Stock;

      if(currentStockProduct.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart(previous => previous.map(item => {
        if(item.id === productId) {
          item.amount = amount;
        }

        return item;
      }));

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
