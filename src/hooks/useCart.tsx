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

  const getStockByProductId = async (productId: number) => {
    await api.get(`/stock/${productId}`).then(response => {
       return (response.data.amount);
    });
  }

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      //const stock = (getStockByProductId(productId)); //
      const stock = await (await api.get(`/stock/${productId}`)).data.amount;
      console.log(stock);
      let product = newCart.find(product => product.id === productId);
      if (product && stock > (product.amount + 1)) {
        product.amount += 1;
        console.log(stock);
      }
      else if (!product && stock > 1) {
        const newProduct = {
          ... await (await api.get(`/products/${productId}`)).data,
          amount: 1
        };
        newCart.push(newProduct);
      }
      else {
        toast.error('Quantidade solicitada fora de estoque');
        console.log(stock);
        return;
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];
      const productIndex = newCart.findIndex(product => product.id === productId);
      if(productIndex >= 0){
        newCart.splice(productIndex, 1);
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      else{
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0)
        return;

      const stock = await (await api.get(`/stock/${productId}`)).data.amount;
      if (amount > stock){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart];
      let product = newCart.find(product => product.id === productId);
      if(product){
        product.amount = amount;
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else
      throw Error();
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
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
